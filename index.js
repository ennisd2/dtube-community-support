const steem = require('steem');
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
var config = require('config.json')('./config.json');
var Store = require("jfs");
var db = new Store("data");
var async = require("async");
var utils = require('./utils/utils.js');

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
	console.log("---" + steem.api.options.url)
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
											console.log("############# " + hash + " detected")
											output = {};
											output.pinset=hash;
											callback(null,output)
										},
										ifExistInDB,
										ifAdding,
										function(input,callback) {
											ipfs.pin.add(input.pinset, function(err1, pinset) {

												//Pin ressource
												size = 0;
												ipfs.ls(input.pinset, function(err2,parts) {
													parts.forEach(function(part) {
														size += part.size;
													});
													console.log("############# " + input.pinset + " added to node");
													console.log("Author : " + result[1].author);
													console.log("Title : " + result[1].title);
													console.log("Permlink : " + result[1].permlink);
													console.log("Link : " + "/#!/v/" + result[1].author + "/" + result[1].permlink);
													console.log("Size : " + size);
													console.log("Date : " + Date());
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
										ifExistInDB,
										function(metadata,callback) {
											db.get("metadata_store", function(err, metadata_store){
												if(err) metadata_store=[];
												metadata_store.push(metadata);
												callback(null,metadata_store,metadata.pinset);
											});
										},
										function(metadata_store, hash, callback){
											db.save("metadata_store", metadata_store, function(err){
												console.log("############# " + hash + " metadata stored");
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
				console.log(error.name)
				console.log(error.message);
				console.log("restart stream() function ")
				stream();
				utils.failover();
				streamOp();


			},10000);
		}
	
	});
}

function ifAdding(input,callback) {
	if(save.some(function(el){return el===input.hash})) {
		console.log(hash + " already Pinning");
		callback(true);
	}
	else
	{
		callback(null,input);

	}

}


function ifExistInDB(input,callback) {
	
	db.get("metadata_store", function(err, metadata_store){
		if(!err)
		{
			
			if(metadata_store.some(function(r){return r.pinset===input.pinset})) {
				console.log(input.pinset + " already stored")
				callback(true);
			}
			else
			{
				console.log(input.pinset + " not already stored");
				callback(null,input);
			}
		}
		else
		{
			//console.log(err);
			console.log("database empty... continue")
			callback(null,input);
		}
	});
}

process.on('uncaughtException', function (err) {
    console.log('error','UNCAUGHT EXCEPTION - keeping process alive:',  err.message);
});
