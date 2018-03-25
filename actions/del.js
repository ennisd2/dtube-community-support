const steem = require('steem');
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
var config = require('config.json')('./../config.json');
var Store = require("jfs");
var db = new Store("./data");
var async = require("async");

var list = require('./list.js');
var utils=require('../utils/utils.js');


let args = require('parse-cli-arguments')({
    options: {

        pinset: { alias: 'p' },
        author: { alias: 'a'}
    }
});

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

filterByAuthor = function(author,metadata) {
	authorSize = 0;
	result = {};
	metadata = metadata.filter(result => {return result.author==author});

	metadata.forEach(result => {authorSize+=result.size});
	result.authorSize = authorSize;
	result.metadata = metadata;
	return result;
}


exports.deleteAuthor = function() {
	async.waterfall([
		function(callback) {
			db.get("metadata_store", function(err, metadata){
				console.log(err)
				if(args.author!=undefined) {
					result = filterByAuthor(args.author, metadata);
					console.log(result)
					if(result.metadata.length>0){
						authorResultMetadata=result.metadata;
						callback(null,authorResultMetadata);
					}
					else {
						console.log(args.author + " not found in DB");
						callback(true)
					}
				}
				else {
					console.log("Usage : npm run rmAuthor -- -a=myAuthor");
					callback(true);
				}
			});
		},
		function(authorResultMetadata,callback) {
			console.log("Deleting all content for : " + args.author);
			async.forEachOf(authorResultMetadata,function(el,i,cb) {
				ipfs.pin.rm(el.pinset, { recursive: true },function(err,pinset){
					if(!err) console.log(pinset[0].hash + " removed");
					cb();

				});
				//console.log(el.pinset)

			}, function(err) {
				callback(null,authorResultMetadata);
			});
		},
		function(authorResultMetadata,callback){
			db.get("metadata_store", function(err, metadata_store){
				authorResultMetadata.forEach(result => {
					metadata_store = metadata_store.filter(re => {return re.pinset!=result.pinset});
				})
				callback(null,metadata_store);
			})
		},
		function(metadata_store,callback) {
			db.save("metadata_store", metadata_store, function(err){
				callback(null)
			});
		},
		function(callback) {
			console.log("Running Garbage collector. Please wait..");
			ipfs.repo.gc(function(err, res){
				if(!err) {
					console.log("Garbade collector done")
				}
				else {
					console.log(err);
				}
			});

		}
	]);
}



exports.deletePin = function() {

	async.waterfall([
		
		function(callback) {
			output = {};
			output.pinset = args.pinset;
			callback(null,output);
		},
		utils.ifExistInDB,
		function(input,exist,callback) {
			if(exist) {
				ipfs.pin.rm(input.pinset, { recursive: true },function(err,pinset){
					if(!err) {
						console.log("############# " + input.pinset + " removed from node");
						callback(null,input);
					}
					else
					{
						if(err.message=="not pinned") {
							callback(null,input);
						}
						else
						{
							console.log(input.pinset + " not removed");
							console.log(err.message);
							callback(true);
						}
	
					}
				});
			}
			else
			{
				callback(true);
			}
		},
		utils.ifExistInDB,
		function(input,exist,callback) {
			if(exist) {
				db.get("metadata_store", function(err,metadata_store) {
					if(err) callback(true);
					callback(null,metadata_store,input);
				});
			}
			else
			{
				callback(true);
			}
		},
		function(metadata_store,input,callback) {
			metadata_store = metadata_store.filter(result => {return result.pinset!=input.pinset});
			db.save("metadata_store", metadata_store, function(err){
				callback(null)
			});

		},
		function(callback) {
			console.log("Running Garbage collector. Please wait..");
			ipfs.repo.gc(function(err, res){
				if(!err) {
					console.log("Garbade collector done")
				}
				else {
					console.log(err);
				}
			});
		}
	])
}





