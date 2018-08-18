const steem = require('steem');
const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
const config = require('config.json')('./../config.json');
const Store = require("jfs");
const db = new Store("./data");
const async = require("async");

const list = require('./list.js');
const utils = require('../utils/utils.js');

/**
 *
 * @param callback
 */
function getImportedDB(callback) {
  // Get imported DB content
  db.get("import_metadata_store", function (err, import_metadata_store) {
    try {
      console.log("DB loaded...")
      callback(null, import_metadata_store);
    }
    catch (err) {
      // Stop import if DB doest not exist
      console.log("data/import_metadata_store.json does not exist. : ", err)
      callback(true);
    }
  });
}

/**
 *
 * @param metadata
 * @param exist
 * @param cb
 */
function getDB(metadata, exist, cb) {
  // get metadata_store before saving metadata in it
  if (!exist) {
    db.get("metadata_store", function (err, metadata_store) {
      if (err) metadata_store = [];
      cb(null, metadata, metadata_store);
    });
  }
  else {
    // don't add to metada_store if pinset already exists in it
    cb(true);
  }

}

/**
 *
 * @param metadata
 * @param cb
 */
function pinAdd(metadata, cb) {
  console.log("try to pin : ", metadata.pinset);
  ipfs.pin.add(metadata.pinset, function (err, pinset) {
    if (!err) {
      console.log(metadata.pinset + " added to node");
      cb(null, metadata);
    }
    else {
      //
      console.log("IPFS is not running");
    }
  });

}

/**
 *
 */
function importDB() {
  async.waterfall([
    getImportedDB,
    function (import_metadata_store, callback) {
      async.eachLimit(import_metadata_store, 1, function (metadata, eachCB) {
        async.waterfall([
          function (metadata, cb) {
            setTimeout(function () {
              console.log(metadata.pinset, " detected");
              cb(null)
            }, 1000)

          }.bind(null, metadata),
          utils.checkSize.bind(null, metadata),
          // pin content
          pinAdd,
          // check in metadata_store if content already exists
          utils.ifExistInDB,
          // get metadata_store before saving metadata in it
          getDB,
          // save metadata in metadata_store
          function (metadata, metadata_store, cb) {

            metadata_store.push(metadata);
            db.save("metadata_store", metadata_store, function (err) {
              console.log(metadata.pinset + " metadata stored");
              cb(null)
            });
          }
        ], function (err) {
          eachCB()
        });
      });
    }

  ]);
}


exports.importDB = importDB;