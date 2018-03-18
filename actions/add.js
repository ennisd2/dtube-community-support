const steem = require('steem');
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
var config = require('config.json')('./../config.json');
var Store = require("jfs");
var db = new Store("./data");
var async = require("async");

var list = require('./list.js');

const dtube_regex = RegExp('https:\/\/d\.tube\/#!\/v\/(.*)\/(.*)$','g');
let args = require('parse-cli-arguments')({
    options: {

        dtube_url: { alias: 'u' },
    }
});

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
			db.get("metadata_store", function(err, metadata_store){
				if(!err) {
					callback(null,metadata_store);
				}
				else
				{
					metadata_store = [];
					callback(null,metadata_store)
				}
			});
		},
		function(metadata_store,callback) {
			
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

							if(metadata_store.some(function(r){return videohash === r.pinset})) {
								console.log(videohash + " already exist")
								callback(true);
							}
							else 
							{
								console.log(videohash + " detected");
								metadata.pinset = videohash;
								metadata.title = result.title;
								metadata.author = author;
								metadata.permlink = permlink;
								metadata.link = "/#!/v/" + author + "/" + permlink;
								metadata.date = new Date(result.created);
								callback(null,metadata,metadata_store);
							}			
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
		function(metadata,metadata_store,callback) {
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
						metadata_store.push(metadata);
						callback(null, metadata_store, metadata.pinset);
					});
				}
				catch(error) {
					console.log(error.name);
					console.log(error.message)
					callback(true);
				}
			});

		},
		function(metadata_store,pinset) {
			db.save("metadata_store", metadata_store, function(err){
				console.log("############# " + pinset + " metadata stored");
			});
		}

	])
}