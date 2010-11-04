require.paths.unshift(__dirname + '/lib');
require.paths.unshift(__dirname + '/vendor/');

var fs = require('fs'),
    sys = require('sys'),
    ws = require('node-websocket-server/lib/ws'),
    server = ws.createServer(),
    redis = require('redis-helper'),
    Mu = require('mu/lib/mu');

var conns = new Array();
var channels = new Array();
var cache = new Array();

Mu.templateRoot = './public';

var config = fs.createReadStream('priv/config.js', {'encoding':'UTF-8'});
config.addListener('error', function(err) {
  console.log('failed to read priv/config.js');
  process.exit(1);
});

config.addListener('data', function(data) {
  console.log('config: ' + data.toString('utf8'));
  var channel_list = eval(data.toString('utf8'));
  if (channel_list) {
    for(var i=0; i<channel_list.length; i++) {
      channels.push({"name": channel_list[i], "label": channel_list[i].replace('stats.', '')});
      exports.setup_channel(channel_list[i]);
    }
  }
});

exports.setup_channel = function(channel) {
  console.log("init channel: " + channel);
  conns[channel] = new Array();
  cache[channel] = new Array();
  redis.subscribe(channel, function(msg) {
    exports.route_msg(channel, msg);
  });
};

exports.route_msg = function(channel, msg) {
  for (var conn in conns[channel]) {
    console.log('sending ' + msg + ' to ' + conns[channel][conn].id);
    if (cache[channel].length > 100) cache[channel].shift();
    cache[channel].push(msg);
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

require('http').createServer(function (request, response) {
  console.log(request.url);
  if (request.url == '/') {
    var view = {
      ws_host: process.env['LOCAL_IP'] || 'localhost',
      ws_port: 8080,
      instances: channels,
      cache: cache
    };
    Mu.render('index.html', view, {}, function (err, output) {
      if (err) {
        throw err;
      }
      var buffer = '';
      output.addListener('data', function (c) {buffer += c; });
      output.addListener('end', function () {
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.end(buffer);
      });
    });
  } else if (request.url.match(/\.js$/) != null) {
    console.log('read public' + request.url);
    var file = fs.createReadStream('public' + request.url, {'encoding':'UTF-8'});
    response.writeHead(200, {'Content-Type': 'text/javascript'});
    file.addListener('data', function(data) {
      response.write(data.toString('utf8'));
    });
    file.addListener('end', function() {
      response.end();
    });
  }
}).listen(8001, "0.0.0.0");
