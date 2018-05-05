const steem = require('steem');
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
var config = require('config.json')('./config.json');
var Store = require("jfs");
var db = new Store("data");
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
bluebird.promisifyAll(db);



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

let args = require('parse-cli-arguments')({
    options: {

        blockNumber: { alias: 'b' },
    }
});



function start() {
    
  

  if(args.blockNumber!=undefined) {
    // take blockNumber passed thought argument
    logger.info("Start Dtube Community Support at block : " + args.blockNumber);
    utils.catchup(Number(args.blockNumber));
  }
  else
  {
    var state = db.getAsync("block_state");
    state.then(result=> {
      // Start from the last block number stored in JFS DB
      logger.info("Start Dtube Community Support at block : " + result.blockNumber);
      utils.catchup(Number(result.blockNumber));
    }).catch(err => {
      // Start to the last block
      lightrpc.sendAsync('get_dynamic_global_properties', []).then(result => {
        logger.info("Start Dtube Community Support at block : " + result.head_block_number);
        utils.catchup(result.head_block_number);
      }).catch(err => {
        // retry with another node
       logger.error('Call failed with lightrpc : ', err.message);
       failover();
       bluebird.delay(5000).then(function() {
         return start();
       })
      });
    });
  }
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
    logger.warn('Failing over to: ' + rpc_node);
  }
}


