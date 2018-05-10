const steem = require('steem');
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
var config = require('config.json')('./../config.json');
var Store = require("jfs");
var db = new Store("./data");
var async = require("async");

var list = require('./list.js');
var utils = require('../utils/utils.js');

const dtube_regex = RegExp('https:\/\/d\.tube\/#!\/v\/(.*)\/(.*)$','g');
let args = require('parse-cli-arguments')({
    options: {

        dtube_url: { alias: 'u' },
    }
});

function findprovs(metadata,callback) { 
	//findprovs check DHT to check if peers has the specified pinset
	console.log("Ty to find seed...");
	ipfs.dht.findprovs(metadata.pinset, function (err,peers) {
		try
		{
			if(peers.some(function(r){return r.Type==4}))
			{
				console.log("seeds exists : ",metadata.pinset);
				callback(null,metadata);
			}
			else
			{
				// no peers are found in DHT. Abort waterfall
				console.log("No seed for : ",metadata.pinset);
				callback(true);
			}
		}
		catch(err) {
			console.log("Cannot findprovs() : ",err);
			callback(true);
		}
	});
}

exports.addPin = function () {

	while ((m = dtube_regex.exec(args.dtube_url)) !== null) {
	    // This is necessary to avoid infinite loops with zero-width matches
	    if (m.index === dtube_regex.lastIndex) {
	        regex.lastIndex++;
	    }
	    
	    var author = m[1];
	    var permlink = m[2];
	}

	async.waterfall([
		function(callback) {
			steem.api.getContent(author,permlink, function(err, result) {
				try {

					if(result.id!=0) {
						if(result.json_metadata!='{}' && result.json_metadata!="") {
							var metadata = {};
							json_metadata = JSON.parse(result.json_metadata);
							if(json_metadata.video.content.video480hash!=undefined) {
								var videohash = json_metadata.video.content.video480hash;
							}
							else
							{
								// if 480p not available
								var videohash = json_metadata.video.content.videohash;

							}


							console.log(videohash + " detected");
							metadata.pinset = videohash;
							metadata.title = result.title;
							metadata.author = author;
							metadata.permlink = permlink;
							metadata.link = "/#!/v/" + author + "/" + permlink;
							metadata.date = new Date(result.created);
							callback(null,metadata);
		
						}	
						else
						{
							console.log("invalid metadata in post");
							callback(true);
		
						}
					}
					else
					{
						console.log("dtube video doest not exist");
						callback(true);
					}
					
				}
				catch(err) {
					console.log("Cannot connect to steem api");
					console.log(err);
					callback(true);
				}
			})
		},
		utils.ifExistInDB,
		function(metadata,exist,callback){
			if(!exist) {
				callback(null,metadata)
			}
			else
			{
				console.log(metadata.pinset + " already exist in db. skip it")
				callback(true);
			}
		},
		findprovs,
		function(metadata,callback) {
			var size = 0;
			ipfs.ls(metadata.pinset, function(err,parts) {
				parts.forEach(function(part) {
					size += part.size;
				});
				ipfs.repo.stat((err,stats) => {
					if(stats.storageMax > Number(stats.repoSize) + size) {
						callback(null,metadata)
					}
					else
					{
						console.log("not enought space. Increase datastore size --current " + Number(stats.storageMax/1000000000).toFixed(2) + " GB-- (.ipfs/config) or delete content (npm run rm -- -p=pinset)")
						callback(true)
					}
				});
			});
		},
		function(metadata,callback) {
			console.log("Pinning the content, please wait...");
			ipfs.pin.add(metadata.pinset, function(err1, pinset) {
				try
				{
					var size = 0;
					ipfs.ls(metadata.pinset, function(err2,parts) {
						parts.forEach(function(part) {
							size += part.size;
						});
						metadata.size = size;
						console.log("############# " + metadata.pinset + " added to node");
						console.log("Author : " + metadata.author);
						console.log("Title : " + metadata.title);
						console.log("Permlink : " + metadata.permlink);
						console.log("Link : " + metadata.link);
						console.log("Size : " + metadata.size);
						console.log("Date : " + metadata.date);
						callback(null, metadata);
					});
				}
				catch(error) {
					console.log(error.name);
					console.log(error.message)
					callback(true);
				}
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
		function(metadata_store,hash) {
			db.save("metadata_store", metadata_store, function(err){
				console.log("############# " + hash + " metadata stored");
			});
		}

	])
}