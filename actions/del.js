const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
const Store = require("jfs");
const db = new Store("./data");

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
  let metadataFilter = metadata.filter(result => {
    return result.author === author
  });

  return metadataFilter;
};

/**
 *
 * @param date
 * @param metadata
 * @returns {*}
 */
filterByDate = function (date, metadata) {
  let metadataFilter = metadata.filter(result => {
    return new Date(result.date) < date;
  });

  return metadataFilter;
};

/**
 *
 * @param pinset
 * @param metadata
 * @returns {*}
 */
filterByPinset = function (pinset, metadata) {
  let metadataFilter = metadata.filter(result => {
    return result.pinset === pinset
  });

  return metadataFilter;
};

/**
 *
 * @param metadata
 */
remove = async function (metadata) {
  try {
    console.log("Metadata", metadata);
    for (let mi = 0; mi < metadata.length; mi++) {
      const el = metadata[mi];
      const pinset = await ipfs.pin.rm(el.pinset, {recursive: true});
      console.log(pinset[0].hash + " removed");
    }

    let metadata_store = db.getSync("metadata_store");
    const possibleError = metadata_store.toString();
    if (possibleError !== "Error: could not load data") {
      for (let mi = 0; mi < metadata.length; mi++) {
        let el = metadata[mi];
        metadata_store = metadata_store.filter(function (re) {
          return re.pinset !== el.pinset
        });
      }
    }

    db.saveSync("metadata_store", metadata_store);

    console.log("Running Garbage collector. Please wait..");
    await ipfs.repo.gc();
    console.log("Garbade collector done")

  } catch (err) {
    console.log("[err][remove]", err);
  }
};

/**
 *
 */
exports.main = function () {
  if (args.pinset !== undefined) {
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
  else if (args.date !== undefined) {
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
  else if (args.author !== undefined) {
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
