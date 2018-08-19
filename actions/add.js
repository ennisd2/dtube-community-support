const steem = require('steem');
const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
const config = require('config.json')('./../config.json');
const Store = require("jfs");
const db = new Store("./data");
const async = require("async");

const list = require('./list.js');
const utils = require('../utils/utils.js');

const dtube_regex = /([a-z][a-z\d.-]{1,14}[a-z\d])\/([a-z\d-]+)\/?$/mg;

const args = require('parse-cli-arguments')({
  options: {
    dtube_url: {alias: 'u'},
    author: {alias: 'a'}
  }
});

/**
 * Main function
 */
function addMain() {
  try {
    if ((args.author == undefined && args.dtube_url == undefined) || (args.author == true || args.dtube_url == true)) throw new Error("Please use add wth -a (add author) or -y (add dtube url)")
    if (args.author != undefined) addAuthor();
    if (args.dtube_url != undefined) addURL();
  }
  catch (err) {
    console.log(err.message)
  }
}

exports.addMain = addMain;

/**
 * Add an author
 */
async function addAuthor() {
  try {
    var author = args.author;
    console.log("Try to pin all dtube content for : ", author);

    let blog = await utils.getBlogAuthor(author);
    blog = await utils.getDtubeContent(blog);

    // Pin author's latest item
    if (blog instanceof Array) {
      addPin(author, blog[0].comment.permlink);
    }
  }
  catch (err) {
    console.log("[addAuthor]", err.message);
  }
}

/**
 * Add a URL
 */
function addURL() {
  // Get author and permlink (used by steem.api.getContent)
  while ((m = dtube_regex.exec(args.dtube_url)) !== null) {
    if (m.index === dtube_regex.lastIndex) {
      regex.lastIndex++;
    }
    var author = m[1];
    var permlink = m[2];

  }

  addPin(author, permlink);
}

/**
 * Get the post from the Steem blockchain and check for an IPFS hash
 * @param author
 * @param permlink
 * @returns {Promise<null>}
 */
async function fetchMetadataFromSteem(author, permlink) {
  try {
    let result = await steem.api.getContentAsync(author, permlink);
    // try to find ipfs hash (480p or source) in json_metadata
    if (result.id != 0) {
      if (result.json_metadata != '{}' && result.json_metadata != "") {
        var metadata = {};
        json_metadata = JSON.parse(result.json_metadata);
        if (json_metadata.video.content.video480hash != undefined && json_metadata.video.content.video480hash != "") {
          var videohash = json_metadata.video.content.video480hash;
        }
        else {
          var videohash = json_metadata.video.content.videohash;

        }

        console.log(videohash + " detected");

        metadata.pinset = videohash;
        metadata.title = result.title;
        metadata.author = author;
        metadata.permlink = permlink;
        metadata.link = "/#!/v/" + author + "/" + permlink;
        metadata.date = new Date(result.created);

        return metadata;
      }
      else {
        console.log("invalid metadata in post");
      }
    }
    else {
      console.log("dtube video doest not exist");
    }
  } catch (err) {
    console.log("Cannot connect to steem api");
    console.log(err);
  }

  return null;
}

/**
 * Pin the media
 * @param metadata
 * @returns {Promise<boolean>}
 */
async function pinMedia(metadata) {
  try {
    console.log("Checking size");
    metadata = await utils.checkSize(metadata);
    if (metadata !== null) {
      console.log("Pinning the content, please wait...");
      const pinset = await ipfs.pin.add(metadata.pinset);

      var size = 0;

      const parts = await ipfs.ls(metadata.pinset);

      parts.forEach(function (part) {
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

      return true;
    }
  } catch (err) {
    console.log("[err][pinmedia]", err);
  }

  return false;
}

/**
 * Add a pin
 * @param author
 * @param permlink
 * @param cbAdd
 * @returns {Promise<boolean>}
 */
async function addPin(author, permlink) {
  const metadata = await fetchMetadataFromSteem(author, permlink);
  if (metadata === null) {
    return false;
  }

  if (utils.ifExistInDB(metadata)) {
    console.log(metadata.pinset + " already exist in db. skip it")
    return false;
  }

  const pinned = await pinMedia(metadata);
  if (pinned === false) {
    console.log(metadata.pinset + " error pinning");
    return false;
  }

  if (utils.ifExistInDB(metadata)) {
    return true;
  } else {
    metadata_store = db.getSync("metadata_store");
    const possibleError = metadata_store.toString();
    if (possibleError === "Error: could not load data") {
      metadata_store = [];
    }

    metadata_store.push(metadata);

    await db.save("metadata_store", metadata_store, function (err) {
      console.log("############# " + metadata.pinset + " metadata stored");
      return true;
    });
  }
}