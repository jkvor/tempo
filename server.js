require.paths.unshift(__dirname + '/lib');
require.paths.unshift(__dirname + '/vendor/');

var fs = require('fs'),
    sys = require('sys'),
    ws = require('node-websocket-server/lib/ws'),
    server = ws.createServer(),
    redis = require('redis-helper'),
    static = require('node-static/lib/node-static');

var conns = new Array();

var config = fs.createReadStream('priv/config.js', {'encoding':'UTF-8'});
config.addListener('data', function(data) {
  var channels = eval(data);
  if (channels) {
    for(var i=0; i<channels.length; i++) {
      exports.setup_channel(channels[i]);
    }
  }
});

exports.setup_channel = function(channel) {
  console.log("init channel: " + channel);
  conns[channel] = new Array();
  redis.subscribe(channel, function(msg) {
    exports.route_msg(channel, msg);
  });
};

exports.route_msg = function(channel, msg) {
  console.log(channel + ": " + msg);
  for (var conn in conns[channel]) {
    console.log('sending ' + msg + ' to ' + conns[channel][conn].id);
    conns[channel][conn].write(msg);
  }
};

server.addListener("connection", function(conn){
  conn.addListener("message", function(msg) {
    var json = JSON.parse(msg);
    exports.open_conn(json.channel, conn);
  });
  conn.addListener("close", function() {
    exports.close_conn(conn.id);
  });
});

exports.open_conn = function(channel, conn) {
  conns[channel].push(conn);
}

exports.close_conn = function(conn_id) {
  for (var channel in conns) {
    //delete conns[i][j];
    for (var conn in conns[channel]) {
      if (conns[channel][conn].id == conn_id) {
        console.log('delete ' + conn_id);
        delete conns[channel][conn];
      }
    }
  }
};

server.listen(8080);

var file = new(static.Server)('./public');
require('http').createServer(function (request, response) {
    request.addListener('end', function () {
        file.serve(request, response);
    });
}).listen(8001);