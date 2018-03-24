const steem = require('steem');
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
var config = require('config.json')('./config.json');
var Store = require("jfs");
var db = new Store("data");
var async = require("async");

var list = require('./actions/list.js');
var add = require('./actions/add.js');
var del = require('./actions/del.js');

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

        sort: { alias: 's' },
        author: { alias: 'a' }
    }
});


switch(args._args[0]) {
	case "list" : 
		list.list();
		break;
	case "listAuthor":
		list.listByAuthor();
		break;
	case "addPin":
		add.addPin()
		break;
	case "deletePin":
		del.deletePin();
		break;
	case "show":
		list.showPinset();
		break;
	case "report":
		list.report();
		break;

}


function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}








