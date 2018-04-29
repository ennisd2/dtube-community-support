const steem = require('steem');
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
var config = require('config.json')('./config.json');
var Store = require("jfs");
const { createClient } = require('lightrpc');
const bluebird = require('bluebird');

var async = require("async");
var winston = require('winston');
require('winston-daily-rotate-file');

var utils = require('./utils/utils.js');

// set rpc node
var cur_node_index = 0;
var lightrpc = createClient(config.rpc_nodes[cur_node_index]);
bluebird.promisifyAll(lightrpc);



var transport = new (winston.transports.DailyRotateFile)({
    filename: 'log/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false,
    maxSize: '20m',
    maxFiles: '14d'
  });

var logger = new (winston.Logger)({
    transports: [
      transport
    ]
  });




lightrpc.sendAsync('get_dynamic_global_properties', []).then(result => {
  utils.catchup(result.head_block_number);
});


