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
        author: { alias: 'a'},
        date: { alias: 'd'}
    }
});

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

filterByAuthor = function(author,metadata) {
	metadataFilter = metadata.filter(result => {
		return result.author==author
	});

	return metadataFilter;
}
 
filterByDate = function(date, metadata) {
	metadataFilter = metadata.filter(result => {
		 return new Date(result.date) < date;
	});

	return metadataFilter;

}

filterByPinset = function(pinset, metadata) {
	metadataFilter = metadata.filter(result => {
		 return result.pinset==pinset
	});

	return metadataFilter;

}

remove = function(metadata) {

	async.waterfall([
		function(callback) {

			async.forEachOf(metadata,function(el,i,cb) {
				ipfs.pin.rm(el.pinset, { recursive: true },function(err,pinset){
					if(!err) console.log(pinset[0].hash + " removed");
					cb();

				});
			}, function(err) {
				callback(null,metadata);
			});

	

		},
		function(metadata,callback){
			db.get("metadata_store", function(err, metadata_store){
				metadata.forEach(result => {
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


exports.main = function() {
	if(args.pinset != undefined) {
		db.get("metadata_store", function(err, metadata){
			pinset = args.pinset;
			result = filterByPinset(pinset, metadata);
			if(result.length>0){
				remove(result);
			}
			else {
				console.log(pinset + " not found in DB");
			}

		});

	}
	else if(args.date != undefined) {
		date = new Date(args.date);
		if(!isNaN(date.getTime()))
		{

			db.get("metadata_store", function(err, metadata){
					result = filterByDate(date, metadata);
					if(result.length>0){
						remove(result);
					}
					else {
						console.log("no entrie found in DB before : " + date);
					}

			});
		}
		else console.log("no valid date provided");
	}
	else if (args.author != undefined) {
		db.get("metadata_store", function(err, metadata){
			author = args.author;
			result = filterByAuthor(author, metadata);
			if(result.length>0){
				remove(result);
			}
			else {
				console.log(author + " not found in DB");
			}
		});

	}
};
