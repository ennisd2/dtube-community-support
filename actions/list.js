const steem = require('steem');
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
var config = require('config.json')('./../config.json');
var Store = require("jfs");
var db = new Store("./data");
var async = require("async");
var columnify = require('columnify');


var list = require('./list.js');

let args = require('parse-cli-arguments')({
    options: {

        sort: { alias: 's' },
        author: { alias: 'a' },
        pinset: { alias: 'p'}
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

exports.listByAuthor = function (){
	async.waterfall(
		[
		function(callback){

			ipfs.repo.stat((err,stats) => {
				callback(null,stats.repoSize,stats.storageMax);
			});
		},
		function(repoSize, storageMax,callback) {
			arrayAuthor = [];
			listAuthor = [];
			
			db.get("metadata_store", function(err, metadata){
				metadata.forEach(function(el) {
					//get author
					arrayAuthor.push(el.author);
				});
				//Then extract Uniq author
				arrayAuthor = arrayAuthor.filter(onlyUnique);
				arrayAuthor.forEach(function(author) {

					tmp = filterByAuthor(author,metadata);
					authorResult = {};
					authorResult.author = author;
					authorResult.authorSize = tmp.authorSize;
					listAuthor.push(authorResult);
				});
				
				listAuthor.sort(function(a,b) {
					return b.authorSize - a.authorSize;
				});

				listAuthor.forEach((result)=>{

					console.log(result.author + " : " + Number(result.authorSize/1000000).toFixed(2) + "Mo")
				});
				
				
			});
		}
	]);
}


exports.showPinset = function() {


	db.get("metadata_store", function(err, metadata_store){
		if(metadata_store.some(function(r){return r.pinset===args.pinset})) {
			metadata = [];
			metadata = metadata_store.filter(result => {return result.pinset==args.pinset})[0];
			console.log(columnify(metadata,{showHeaders: false}))
		}
	});
}



exports.list = function () {
	async.waterfall(
		[
		function(callback){

			ipfs.repo.stat((err,stats) => {
				callback(null,stats.repoSize,stats.storageMax);
			});
		},
		function(repoSize, storageMax,callback) {
			db.get("metadata_store", function(err, metadata){
				var list = [];
				if(args.sort!=undefined){
					switch(args.sort) {
						case "size" : 
							metadata = metadata.sort(function(a,b) {
								return b.size - a.size;
							});
							break;
						case "date" :
							metadata = metadata.sort(function(a,b) {
								return new Date(b.date) - new Date(a.date);
							});
							break;
						default:
							metadata = metadata_store.sort(function(a,b) {
								return new Date(a.date) - new Date(b.date);
							})

					}

				}

				if(args.author!=undefined) {
					result = filterByAuthor(args.author, metadata);
					authorSize=result.authorSize;
					metadata=result.metadata;
					console.log("User " + args.author + " use : " + Number(authorSize/1000000).toFixed(2) + "Mo");
				}

				console.log("Repository usage : " + Number(repoSize/1000000000).toFixed(2) + "Go / " +Number(storageMax/1000000000).toFixed(2) + "Go");
				metadata.forEach((result)=>{
					tmp = {};
					tmp.pinset=result.pinset;
					tmp.date=new Date(result.date);
					tmp.size = Number(result.size/1000000).toFixed(2) + "Mo";
					tmp.link = result.link;
				});
				console.log(columnify(list,{columnSplitter: ' | '}));
			});

		}
		])

	
}