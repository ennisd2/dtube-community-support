const steem = require('steem');
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
var config = require('config.json')('./config.json');
var Store = require("jfs");
var db = new Store("data");
var async = require("async");



//steem.api.setOptions({ url: 'https://rpc.steemliberator.com ' });
var dtube_app = config.dtube_app;
var tags = config.tags;
var save = [];

stream();
function stream()
{
	try 
	{
		steem.api.streamOperations("irreversible",(err, result) => {
			if(err) {
				console.log(err);
			}
			else
			{
				if(result[0]=='comment') {
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
												var videohash = json_metadata.video.content.video480hash;
											}
											else
											{
												// if 480p not available
												var videohash = json_metadata.video.content.videohash;
												}
											}

											var videohash = json_metadata.video.content.video480hash;
									
											console.log("############# " + videohash + " detected")
											db.get("metadata_store", function(err, metadata_store){
												if(!err)
												{
													if (metadata_store.some(function(r){return r.pinset===videohash}) || save.some(function(el){return el===videohash})) {
														exist=true;
														console.log(videohash + " already stored");
													}
													else
													{
														exist=false;
														console.log(videohash + " not already stored");
														save.push=videohash;
														
													}
												}
												else
												{
													console.log(videohash + " not already stored");
													console.log("metadata file is empty");
													exist=false;
													metadata_store=[];
													save.push=videohash;
													
												}
												callback(null,exist,metadata_store,videohash);
											});
										},
										function(exist,metadata_store,videohash,callback) {
											if(!exist)
											{
												ipfs.pin.add(videohash, function(err1, pinset) {
													//Pin ressource
													var size = 0;
													ipfs.ls(pinset[0].hash, function(err2,parts) {
														parts.forEach(function(part) {
															size += part.size;
														});
														console.log("############# " + pinset[0].hash + " added to node");
														console.log("Author : " + result[1].author);
														console.log("Title : " + result[1].title);
														console.log("Permlink : " + result[1].permlink);
														console.log("Link : " + "/" + JSON.parse(result[1].json_metadata).tags[0] + "/@" + result[1].author + "/" + result[1].permlink);
														console.log("Size : " + size);
														console.log("Date : " + Date());
														var metadata = {};
														metadata.pinset = pinset[0].hash;
														metadata.author = result[1].author;
														metadata.title = result[1].title;
														metadata.permlink = result[1].parent_permlink;
														metadata.link = "/" + JSON.parse(result[1].json_metadata).tags[0] + "/@" + result[1].author + "/" + result[1].permlink;
														metadata.size = size;
														metadata.date = Date();
														save = save.filter(function(el){return el!==pinset[0].hash;});
														metadata_store.push(metadata);
														callback(null, metadata_store, pinset[0].hash);
													});
												});
											}
										},
										function(metadata_store, videohash, callback){
											db.save("metadata_store", metadata_store, function(err){
												console.log("############# " + videohash + " metadata stored");
											});
										}
									]);
								}
							}
						}
					}
				}
			}
		
		});
	}
	catch(error) {
		console.log("restart function stream")
		setTimeout(function(){ 
			console.log(error);

			stream();
		},60000);
	}
}

process.on('uncaughtException', function (err) {
    console.log('error','UNCAUGHT EXCEPTION - keeping process alive:',  err.message);
});

