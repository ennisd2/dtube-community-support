const steem = require('steem');
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
var conf = require('config.json')('./config.json');
var Store = require("jfs");

var async = require("async");
var winston = require('winston');
require('winston-daily-rotate-file');

var utils = require('../utils/utils.js');

var transport = new (winston.transports.DailyRotateFile)({
    filename: 'log/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false,
    maxSize: '20m',
    maxFiles: '14d'
  });

var logger = new (winston.Logger)({
    transports: [
      transport
    ]
  });


//used to listen only dtube publication.
var dtube_app = conf.dtube_app;
// used to pin content of one  of tags configured in configu.json
var tags = conf.tags;
var blacklist = conf.blacklist;
var whitelist = conf.whitelist;

// 'save' is used to prevent to pin when authors edit dtube publication multiple times while video is 'pin add' is running
// hash is added before "pin add"
// hash is deleted after "pin add"
var save = [];

// 'size_tmp' is used to check that the maximum size of the directory is not exceeded
// "size_tmp" is the sum of all content content in the pinning process  
var size_tmp = 0;

function isObject(val) {
    return val instanceof Object; 
}

function streamOps(ops) {
	
	
	ops.forEach(function(op) {
		var result = {};
		result = op.op;
		db = new Store("./data");
		if(result[0]=='comment') 
		{
			
			//verify if no a response and if json_metadata is not empty
			//if(result[1].parent_author == "" && result[1].json_metadata!='{}' && result[1].json_metadata!="" && result[1].json_metadata!='null')
			//{}
			if(result[1].parent_author === "" && result[1].json_metadata != "{}")
			{
				try
				{
					// test if json_metadata can be parsed 
					json_metadata = JSON.parse(result[1].json_metadata);
					// test if json_metadata is an object
      				if(!json_metadata || typeof json_metadata !== 'object') throw new Error('Wrong type:', typeof json_metadata);
					//verify if app is not undefined and not an object (dtube app is defined as a string)

					// Check app is not empty and not an object
					if(json_metadata.app !='{}' && json_metadata.app!=""  && json_metadata.app != undefined && !isObject(json_metadata.app))
					{
	
						//select dtube publication
						if(json_metadata.app.includes(dtube_app))
						{
	
							//select tags AND not in blacklist 
							if((json_metadata.tags.some(function(r){return tags.indexOf(r) >=0}) && (blacklist.indexOf(result[1].author) === -1)) || (whitelist.indexOf(result[1].author) >= 0) )
							{
								async.waterfall (
								[
									function(callback) 
									{
										//collect videhash inside metadata
										if(json_metadata.video.content.video480hash!=undefined) {
											var hash = json_metadata.video.content.video480hash;
										}
										else
										{
											// if 480p not available
											var hash = json_metadata.video.content.videohash;
										}
										logger.info("############# " + hash + " detected")
										output = {};
										output.pinset=hash;
										callback(null,output)
									},
									utils.ifExistInDB,
									function(input,exist,callback) {
										if(!exist)
										{
											// Do no try to pin video if already in DB
											logger.info(input.pinset + " not in DB.")
											callback(null,input);
										}
										else
										{
											logger.info(input.pinset + " already exist. skip it")
											// delete entrie in temp 'save' var
											save = save.filter(function(el){return el!==input.pinset;});
											callback(true);
										}
									},
									ifAdding,
									function(input,callback) {
										ipfs.ls(input.pinset, function(err2,parts) {
											try {
											var content_size = 0;
											// check if enought space in repo before pinning it
											parts.forEach(function(part) {
												// increment global size_tmp
												content_size += part.size;
											});
											// add content size to content processed
											size_tmp+=content_size;
											ipfs.repo.stat((err,stats) => {
												logger.info("repo size : " + Number(stats.repoSize));
												logger.info("size tmp : "+size_tmp)
												logger.info("content size :"+content_size)
												// don't pin if not enough free space (repoSize + content in pinning process)
												if(stats.storageMax > Number(stats.repoSize) + size_tmp) {
													callback(null,input)
												}
												else
												{
													// content not pinned, substract content size
													size_tmp-=content_size;
													logger.info("not enought space. Increase datastore size --current " + Number(stats.storageMax/1000000000).toFixed(2) + " GB-- (.ipfs/config) or delete content (npm run rm -- -p=pinset)")
													logger.info("repo size : " + Number(stats.repoSize));
													logger.info("new size tmp : "+size_tmp)
													// content not pinned, substract content size
													size_tmp-=content_size;
													callback(true)
												}
											});
											}
											catch(e) {
												save = save.filter(function(el){return el!==input.pinset;});
												console.log(e)
											}
										});
									},
									function(input,callback) {
										ipfs.pin.add(input.pinset, function(err1, pinset) {
											//Pin ressource
											size = 0;
											ipfs.ls(input.pinset, function(err2,parts) {
												parts.forEach(function(part) {
													size += part.size;
												});
												logger.info("############# " + input.pinset + " added to node");
												logger.info("Author : " + result[1].author);
												logger.info("Title : " + result[1].title);
												logger.info("Permlink : " + result[1].permlink);
												logger.info("Link : " + "/#!/v/" + result[1].author + "/" + result[1].permlink);
												logger.info("Size : " + size);
												logger.info("Date : " + Date());
												metadata = {};
												metadata.pinset = input.pinset;
												metadata.author = result[1].author;
												metadata.title = result[1].title;
												metadata.permlink = result[1].parent_permlink;
												metadata.link = "/#!/v/" + result[1].author + "/" + result[1].permlink;
												metadata.size = size;
												metadata.date = Date();
												callback(null, metadata);
											});
										});
									},
									utils.ifExistInDB,
									function(metadata,exist,callback) {
										if(!exist) {
											db.get("metadata_store", function(err, metadata_store){
												if(err) metadata_store=[];
												metadata_store.push(metadata);
												callback(null,metadata_store,metadata);
											});
										}
										else
										{
											save = save.filter(function(el){return el!==metadata.pinset;});
											// content not pinned, substract content size
											size_tmp-=content_size;
											callback(true);
										}
									},
									function(metadata_store, metadata, callback){
										db.save("metadata_store", metadata_store, function(err){
											logger.info("############# " + metadata.pinset + " metadata stored");
											// delete entrie in temp 'save' var
											save = save.filter(function(el){return el!==metadata.pinset;});
											size_tmp = size_tmp-Number(metadata.size_tmp)
										});
									}
								]);
							}
						}
					}
				}
				catch(err) {
					logger.debug(err.message)
				}

			}
		}
		
	});
};

function ifAdding(input,callback) {
	// check if pinset is in 'save'
	if(save.some(function(el){return el===input.pinset})) {
		logger.info(input.pinset + " already Pinning. skip it");
		callback(true);
	}
	else
	{
		save.push(input.pinset);
		callback(null,input);

	}

}

exports.streamOps=streamOps;


