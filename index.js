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



function start() {
lightrpc.sendAsync('get_dynamic_global_properties', []).then(result => {
  logger.info("Start Dtube Community Support at block : " + result.head_block_number);
  utils.catchup(result.head_block_number);
}).catch(err => {
    console.error('Call failed with lightrpc', err);
    // try another node
    failover();
    bluebird.delay(5000).then(function() {
      return start();
    })
  });
}

start();

function failover() {
  // failover function
  if(config.rpc_nodes && config.rpc_nodes.length > 1) {
    cur_node_index += 1;

    if(cur_node_index == config.rpc_nodes.length)
      cur_node_index = 0;

    var rpc_node = config.rpc_nodes[cur_node_index];

    
    lightrpc = createClient(rpc_node);
    bluebird.promisifyAll(lightrpc);
    logger.warn('');
    logger.warn('***********************************************');
    logger.warn('Failing over to: ' + rpc_node);
    logger.warn('***********************************************');
    logger.warn('');
  }
}


