const steem = require('steem');
const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
const config = require('config.json')('./../config.json');
const Store = require("jfs");
const db = new Store("./data");
const async = require("async");

const list = require('./list.js');
const utils = require('../utils/utils.js');


const args = require('parse-cli-arguments')({
  options: {

    pinset: {alias: 'p'},
    author: {alias: 'a'},
    date: {alias: 'd'}
  }
});

/**
 *
 * @param value
 * @param index
 * @param self
 * @returns {boolean}
 */
function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

/**
 *
 * @param author
 * @param metadata
 * @returns {*}
 */
filterByAuthor = function (author, metadata) {
  metadataFilter = metadata.filter(result => {
    return result.author == author
  });

  return metadataFilter;
}

/**
 *
 * @param date
 * @param metadata
 * @returns {*}
 */
filterByDate = function (date, metadata) {
  metadataFilter = metadata.filter(result => {
    return new Date(result.date) < date;
  });

  return metadataFilter;

}

/**
 *
 * @param pinset
 * @param metadata
 * @returns {*}
 */
filterByPinset = function (pinset, metadata) {
  metadataFilter = metadata.filter(result => {
    return result.pinset == pinset
  });

  return metadataFilter;

}

/**
 *
 * @param metadata
 */
remove = function (metadata) {

  async.waterfall([
    function (callback) {

      async.forEachOf(metadata, function (el, i, cb) {
        ipfs.pin.rm(el.pinset, {recursive: true}, function (err, pinset) {
          if (!err) console.log(pinset[0].hash + " removed");
          cb();

        });
      }, function (err) {
        callback(null, metadata);
      });


    },
    function (metadata, callback) {
      db.get("metadata_store", function (err, metadata_store) {
        metadata.forEach(result => {
          metadata_store = metadata_store.filter(re => {
            return re.pinset != result.pinset
          });
        })
        callback(null, metadata_store);
      })
    },
    function (metadata_store, callback) {
      db.save("metadata_store", metadata_store, function (err) {
        callback(null)
      });
    },
    function (callback) {
      console.log("Running Garbage collector. Please wait..");
      ipfs.repo.gc(function (err, res) {
        if (!err) {
          console.log("Garbade collector done")
        }
        else {
          console.log(err);
        }
      });

    }
  ]);

}

/**
 *
 */
exports.main = function () {
  if (args.pinset != undefined) {
    db.get("metadata_store", function (err, metadata) {
      pinset = args.pinset;
      result = filterByPinset(pinset, metadata);
      if (result.length > 0) {
        remove(result);
      }
      else {
        console.log(pinset + " not found in DB");
      }

    });

  }
  else if (args.date != undefined) {
    date = new Date(args.date);
    if (!isNaN(date.getTime())) {

      db.get("metadata_store", function (err, metadata) {
        result = filterByDate(date, metadata);
        if (result.length > 0) {
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
    db.get("metadata_store", function (err, metadata) {
      author = args.author;
      result = filterByAuthor(author, metadata);
      if (result.length > 0) {
        remove(result);
      }
      else {
        console.log(author + " not found in DB");
      }
    });

  }
};
