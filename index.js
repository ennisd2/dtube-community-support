const steem = require('steem');
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
var config = require('config.json')('./config.json');
var Store = require("jfs");
var db = new Store("data");
var async = require("async");
var winston = require('winston');
require('winston-daily-rotate-file');

var utils = require('./utils/utils.js');


var transport = new (winston.transports.DailyRotateFile)({
    filename: 'application-%DATE%.log',
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
  });

var logger = new (winston.Logger)({
    transports: [
      transport
    ]
  });




var dtube_app = config.dtube_app;
var tags = config.tags;
var save = [];

var streamvar;


Array.prototype.random = function () {
  return this[Math.floor((Math.random()*this.length))];
}

steem.api.setOptions({ transport: 'http', uri: config.rpc_nodes.random(), url: config.rpc_nodes.random() });
//steem.api.setOptions({ transport: 'http', uri: config.rpc_nodes[0], url: config.rpc_nodes[0] });
streamOp();


function streamOp()
{
	logger.info("---" + steem.api.options.url)
	stream = steem.api.streamOperations("irreversible",(err, result) => {
		try 
		{	
		
				if(result[0]=='comment') 
				{
					//verify if no a response and if json_metadata is not empty
					if(result[1].parent_author == "" && result[1].json_metadata!='{}' && result[1].json_metadata!="")
					{
						json_metadata = JSON.parse(result[1].json_metadata);
						
						//verify if app is not undefined
						if(json_metadata.app !='{}' && json_metadata.app!=""  && json_metadata.app != undefined)
						{
							//select dtube publication
							if(json_metadata.app.includes(dtube_app))
							{
								//select specific tags
								if(json_metadata.tags.some(function(r){return tags.indexOf(r) >=0}))
								{
									async.waterfall (
									[
										function(callback) 
										{
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
												logger.info(input.pinset + " not in DB. store it")
												callback(null,input);
											}
											else
											{
												logger.info(input.pinset + " already exist. skip it")
												callback(true);
											}
										},
										ifAdding,
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
													save = save.filter(function(el){return el!==input.pinset;});
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
													callback(null,metadata_store,metadata.pinset);
												});
											}
											else
											{
												callback(true);
											}
										},
										function(metadata_store, hash, callback){
											db.save("metadata_store", metadata_store, function(err){
												logger.info("############# " + hash + " metadata stored");
											});
										}
									]);
								}
							}
						}
					}
				}
			
		}
		catch(error) {
			
			//console.log(error);
			setTimeout(function(){ 
				logger.warn(error.name)
				logger.warn(error.message);
				logger.warn("restart stream() function ")
				stream();
				utils.failover();
				streamOp();


			},10000);
		}
	
	});
}

function ifAdding(input,callback) {
	if(save.some(function(el){return el===input.pinset})) {
		logger.info(input.pinset + " already Pinning");
		callback(true);
	}
	else
	{
		save.push(input.pinset);
		callback(null,input);

	}

}




process.on('uncaughtException', function (err) {
    logger.warn('error','UNCAUGHT EXCEPTION - keeping process alive:',  err.message);
});
