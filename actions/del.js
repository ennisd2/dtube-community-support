const steem = require('steem');
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
var config = require('config.json')('./../config.json');
var Store = require("jfs");
var db = new Store("./data");
var async = require("async");

var list = require('./list.js');


let args = require('parse-cli-arguments')({
    options: {

        pinset: { alias: 'p' },
    }
});





exports.deletePin = function() {

	async.waterfall([
		function(callback) {
			db.get("metadata_store", function(err, metadata_store){
				if(metadata_store.some(function(r){return r.pinset===args.pinset})) {
					callback(null,metadata_store);
				}
				else
				{
					callback(true);
				}
				
			});
		},
		function(metadata_store,callback) {
			ipfs.pin.rm(args.pinset, { recursive: true },function(err,pinset){
				if(!err) {
					console.log("############# " + pinset[0].hash + " removed from node");
					callback(null,metadata_store,pinset[0].hash);
				}
				else
				{
					if(err.message=="not pinned") {
						callback(null,metadata_store,args.pinset);
					}
					else
					{
						console.log(args.pinset + " not removed");
						console.log(err.message);
						callback(true);
					}

				}
			});
		},
		function(metadata_store,pinset,callback) {
			metadata_store = metadata_store.filter(result => {return result.pinset!=pinset});
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





