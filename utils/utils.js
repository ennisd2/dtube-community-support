const steem = require('steem');
var config = require('config.json')('./config.json');
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
var Store = require("jfs");
const { createClient } = require('lightrpc');
const bluebird = require('bluebird');
var Store = require("jfs");
var db = new Store("./data");
const { spawn } = require('child_process');



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

var LSTIMEOUT = 120000;

// dtube app (use to filter author blog)
var DTUBE_APP = config.dtube_app;


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

function checkIPFS(cb) {
  ipfs.version(function(err,version) {
    if(err) 
    { 
      console.log("IPFS is not running ?",err.message); 
      cb(true);
    }
    else cb(null);
  });
}
exports.checkIPFS = checkIPFS;

function checkSize(metadata,cbSize) {
  console.log("Try to find seed for : ",metadata.pinset)
  // launch go-ipfs ls pinset command
  var ipfsLsProcess=spawn('ipfs',['ls',metadata.pinset]);

  var timeout = setTimeout(function() {
    // Kill child process if "ipfs ls" takes too long to respond
    ipfsLsProcess.stdin.pause();
    ipfsLsProcess.kill('SIGINT');
  }, LSTIMEOUT);

  ipfsLsProcess.stderr.on('data', (data) => {
    if(data.toString()!="Error: api not running\n") {
      // No response from ipfs ls. Pass to the next pinset
      console.log('cannot fetch (',metadata.pinset,') size in : ',LSTIMEOUT/1000,' seconds');
      cbSize(true);
    }
    else {
      // IPFS is not running. Stop the script (with callback of main waterfall)
      console.log("IPFS is not running")
      clearTimeout(timeout)
    }
  });
  ipfsLsProcess.stdout.on('data', (data) => {
    // calcul contente size
    if(data.toString()!='\n') {
      var size = 0;
      part = data.toString().split('\n');
      part=part.filter(function(el){return el!=='';});
      part.forEach(element => {
          size += Number(element.split(" ")[1]);
      });
      ipfs.repo.stat((err,stats) => {
        if(stats.storageMax > Number(stats.repoSize) + size) {
            // erase 'size' in metadata
            metadata.size=size;
            // pass callback of main waterfall in order to stop script if ipfs daemon is stopped during "pin add" process
            cbSize(null,metadata)
        }
        else
        {
            console.log("not enough space. Increase datastore size --current " + Number(stats.storageMax/1000000000).toFixed(2) + " GB-- (.ipfs/config) or delete content (npm run rm -- -p=pinset)");
            cbSize(true);
        }
      });
      // Prevent to kill another process (using the last "ipfs ls" pid )
      clearTimeout(timeout);

    }
  })
}

exports.checkSize = checkSize;

exports.ifExistInDB = function(input,cb) {
  // verify if pinset already store in DB
  db = new Store("./data");
  db.get("metadata_store", function(err, metadata_store){
    if(!err)
    {
   
      if(metadata_store.some(function(r){return r.pinset===input.pinset})) {

        exist=true;
      }
      else
      {
        exist=false;
      }
    }
    else
    {
      exist=false;
    }
    cb(null,input,exist);
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
      // Process the block and search dtube content
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

function getBlogAuthor(author,cb) {
  //Return all last 500 publications (except resteem)
  lightrpc.sendAsync('condenser_api.get_blog', [author,0,500]).then(blog => {
    blog = blog.filter(function(el){return el.comment.author===author;});
    cb(null,blog)
  }).catch(err => {
    console.log(err)
    cb(true);
  })
}
exports.getBlogAuthor=getBlogAuthor;
function getDtubeContent(blog,cb) {
  // Find dtube content in the blog
  var dtubeBlog = [];
  try{
    blog.forEach((post) => {
      // test if json_metadata can be parsed 
      json_metadata = JSON.parse(post.comment.json_metadata);    
      // test if json_metadata is an object
      if(!json_metadata || typeof json_metadata !== 'object') throw new Error('Wrong type:', typeof json_metadata);
      if (json_metadata.app =='{}') throw new Error('Bad format format : json_metadata.app')
      if (json_metadata.app=="") throw new Error("json_metadata.app is empty");
      
      if (json_metadata.app.includes(DTUBE_APP)) {
        dtubeBlog.push(post)
      }
    })
    cb(null,dtubeBlog);
  }
  catch(err) {
    cb(true)
  }
}

exports.getDtubeContent = getDtubeContent;