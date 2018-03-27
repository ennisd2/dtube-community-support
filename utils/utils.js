const steem = require('steem');
var config = require('config.json')('./config.json');
var Store = require("jfs");

var winston = require('winston');
require('winston-daily-rotate-file');

var transport = new (winston.transports.DailyRotateFile)({
    filename: 'log/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
  });

var logger = new (winston.Logger)({
    transports: [
      transport
    ]
  });


exports.failover = function() {
  if(config.rpc_nodes && config.rpc_nodes.length > 1) {
    var cur_node_index = config.rpc_nodes.indexOf(steem.api.options.url) + 1;

    if(cur_node_index == config.rpc_nodes.length)
      cur_node_index = 0;

    var rpc_node = config.rpc_nodes[cur_node_index];

    steem.api.setOptions({ transport: 'http', uri: rpc_node, url: rpc_node });
    logger.warn('');
    logger.warn('***********************************************');
    logger.warn('Failing over to: ' + rpc_node);
    logger.warn('***********************************************');
    logger.warn('');
  }
}

	
exports.ifExistInDB = function(input,callback) {
  db = new Store("./data");
  db.get("metadata_store", function(err, metadata_store){
    if(!err)
    {
      
      if(metadata_store.some(function(r){return r.pinset===input.pinset})) {
        logger.info(input.pinset + " already stored")
        exist=true;
      }
      else
      {
        logger.info(input.pinset + " not already stored");
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


