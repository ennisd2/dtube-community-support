const steem = require('steem');
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
var config = require('config.json')('./../config.json');
var Store = require("jfs");
var db = new Store("./data");
var async = require("async");

var list = require('./list.js');
var utils = require('../utils/utils.js');

  
function getImportedDB(callback) {
    // Get imported DB content
    db.get("import_metadata_store", function(err, import_metadata_store){
        try
        {
            console.log("DB loaded...")
            callback(null,import_metadata_store);
        }
        catch(err) {
            // Stop import if DB doest not exist
            console.log("data/import_metadata_store.json does not exist.")
            callback(true);
        }
    });
}
function getDB(metadata,exist,cb) {
    // get metadata_store before saving metadata in it

    if(!exist) {
        db.get("metadata_store", function(err, metadata_store){
            if(err) metadata_store=[];
            cb(null,metadata,metadata_store);
        });
    }
    else {
        // abort if pinset already exist in metadata_store
        cb(true);
    }

}


function checkSeed(metadata,cb) {
    // iterate each entries to find and delete pinset without seed

    ipfs.dht.findprovs(metadata.pinset, function (err,peers) {
        if(!err)
        {   
            if(!peers.some(function(r){return r.Type==4})) {
                // abort, if content cannot be downloaded
                console.log(metadata.pinset, + " cannot be downloaded")
                cb(true);
            }
            else {
                console.log(metadata.pinset + " can be downloaded")
                cb(null,metadata);
            }
        }
        else
        {
            console.log(" error occurs in findprovs() : ",err.message);
            cb(true);
        }
    });


}

function pinAdd(metadata,cb) {
    ipfs.pin.add(metadata.pinset, function(err, pinset) {
        if(!err)
        {
            console.log(metadata.pinset + " added to node");
            cb(null,metadata);
        }
        else
        {
            console.log("IPFS is not running ? ",err.message);
            cb(true);
        }
    });

}

function checkSize(metadata,cb) {

    var size = 0;
    ipfs.ls(metadata.pinset, function(err,parts) {
        if(!err)
        {
            parts.forEach(function(part) {
                size += part.size;
            });
            ipfs.repo.stat((err,stats) => {
                if(stats.storageMax > Number(stats.repoSize) + size) {
                    // erase 'size' in metadata
                    cb(null,metadata)
                }
                else
                {
                    console.log("not enough space. Increase datastore size --current " + Number(stats.storageMax/1000000000).toFixed(2) + " GB-- (.ipfs/config) or delete content (npm run rm -- -p=pinset)")
                    cb(true)
                }
            });
        }
        else 
        {
            console.log("IPFS is not running ? ",err.message);
            cb(true);
        }
    });
}
function importDB() {
    async.waterfall([
        utils.checkIPFS,
        getImportedDB,
        function(import_metadata_store,callback) {
            async.each(import_metadata_store, function(metadata,eachCB) {
                async.waterfall([
                    // check if seed exit for the pinset
                    checkSeed.bind(null,metadata),
                    // check if enough space
                    checkSize,
                    // pin content
                    pinAdd,
                    // check in metadata_store if content already exists
                    utils.ifExistInDB,
                    // get metadata_store before saving metadata in it
                    getDB,
                    // save metadata in metadata_store
                    function(metadata,metadata_store,exist,cb) {
                        metadata_store.push(metadata);
                        db.save("metadata_store", metadata_store, function(err){
                            console.log(metadata.pinset + " metadata stored");
                            eachCB();
                        });
                    }
                ]);
            });
        }

    ]);
    

}


importDB();