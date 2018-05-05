const steem = require('steem');
var config = require('config.json')('./config.json');
var Store = require("jfs");
const { createClient } = require('lightrpc');
const bluebird = require('bluebird');
var Store = require("jfs");
var db = new Store("./data");


var winston = require('winston');
require('winston-daily-rotate-file');

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

var stream = require('../actions/stream.js');

// set rpc node
var cur_node_index = 0;
var lightrpc = createClient(config.rpc_nodes[cur_node_index]);
bluebird.promisifyAll(lightrpc);

// those var are used to print 'block' logs each X minutes 
var block_processed = 0;
var block_per_minute = 20;
// print each hours
var log_block_each_time = block_per_minute * 60;
// save block state each minutes
var save_block_each_time = block_per_minute * 1;

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

exports.failover = failover;

exports.ifExistInDB = function(input,callback) {
  // verify if pinset already store in DB
  db = new Store("./data");
  db.get("metadata_store", function(err, metadata_store){
    if(!err)
    {
   
      if(metadata_store.some(function(r){return r.pinset===input.pinset})) {
        logger.info(input.pinset + " exist in DB")

        exist=true;
      }
      else
      {
        logger.info(input.pinset + " not exist in DB");
        exist=false;
      }
    }
    else
    {
      //console.log(err);
      logger.info("database empty... continue")
      exist=false;
    }
    callback(null,input,exist);
  });
}

function catchup(blockNumber) {
  

  lightrpc.sendAsync('get_ops_in_block', [blockNumber, false]).then(ops => {
    if (!ops.length) {

      //console.error('Block does not exist?');
      lightrpc.sendAsync('get_block', [blockNumber]).then(block => {
        if (block && block.transactions.length === 0) {
          // save block number in JFS DB
          if(block_processed % save_block_each_time == 0) {
            saveBlockState(blockNumber);
          }
          //console.log('Block exist and is empty, load next', blockNumber);
          if(block_processed % log_block_each_time == 0) {
            logger.info('At block : ',blockNumber, ' timestamp ',block.timestamp)
          }

          block_processed +=1;
          return catchup(blockNumber + 1);
        } else {
          //block does not exist
          //console.log('Retry', blockNumber);
          bluebird.delay(5000).then(function() {
            return catchup(blockNumber);
          });
        }
      }).catch(err => {
        //console.log('Retry', blockNumber);
        bluebird.delay(5000).then(function() {
          return catchup(blockNumber);
        });
      });
    } else {
      //console.log('Block loaded', blockNumber);
      // save block number in JFS DB
      if(block_processed % save_block_each_time == 0) {
        saveBlockState(blockNumber);
      }
      if(block_processed % log_block_each_time == 0) {
        logger.info('At block : ',blockNumber, ' timestamp ',ops[0].timestamp)
      }
      block_processed +=1;
      // Process the block and search dtube cotent
      stream.streamOps(ops);

      return catchup(blockNumber + 1);
    }
  }).catch(err => {
    logger.error('Call failed with lightrpc : ', err.message);
    
    // try another node
    failover();
    //console.log('Retry', blockNumber);
    bluebird.delay(5000).then(function() {
      return catchup(blockNumber);
    })

  });
};

exports.catchup = catchup;

function saveBlockState(blockNumber) {
  state = {blockNumber: blockNumber}
  db.save("block_state", state);
}

