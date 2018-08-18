const steem = require('steem');
const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
const config = require('config.json')('./config.json');
const Store = require("jfs");
const db = new Store("data");
const async = require("async");

const list = require('./actions/list.js');
const add = require('./actions/add.js');
const del = require('./actions/del.js');
const importDB = require('./actions/importDB.js');

let configuration = {
  options: {},  //Object
  flagSymbol: '--', //String
  aliasSymbol: '-', //String
  argumentSymbol: '=', //String
  stopArgument: '--', //String
  restArguments: 'argv', //String
  debug: false //Boolean
}
let args = require('parse-cli-arguments')({
  options: {

    sort: {alias: 's'},
    author: {alias: 'a'}
  }
});


switch (args._args[0]) {
  case "list" :
    list.list();
    break;
  case "listAuthor":
    list.listByAuthor();
    break;
  case "add":
    add.addMain();
    break;
  case "delete":
    del.main();
    break;
  case "show":
    list.showPinset();
    break;
  case "report":
    list.report();
    break;
  case "importDB":
    importDB.importDB();
    break;
}

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








