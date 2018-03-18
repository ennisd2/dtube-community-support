const steem = require('steem');
var config = require('config.json')('./config.json');


exports.failover = function() {
	console.log("failover")
  if(config.rpc_nodes && config.rpc_nodes.length > 1) {
    var cur_node_index = config.rpc_nodes.indexOf(steem.api.options.url) + 1;

    if(cur_node_index == config.rpc_nodes.length)
      cur_node_index = 0;

    var rpc_node = config.rpc_nodes[cur_node_index];

    steem.api.setOptions({ transport: 'http', uri: rpc_node, url: rpc_node });
    console.log('');
    console.log('***********************************************');
    console.log('Failing over to: ' + rpc_node);
    console.log(steem.api.options.url)
    console.log('***********************************************');
    console.log('');
  }
}

	