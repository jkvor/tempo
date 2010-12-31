require.paths.unshift(__dirname + '/lib');
require.paths.unshift(__dirname + '/vendor/');

var fs = require('fs'),
    sys = require('sys'),
    http = require('http'),
    ws = require('node-websocket-server/lib/ws'),
    server = ws.createServer(),
    redis = require('redis-helper'),
    db = redis.connection,
    Mu = require('mu/lib/mu');

var websocket_port = parseInt(process.env['WEBSOCKET_PORT'] || '8080');
var http_port = parseInt(process.env['PORT'] || '8001');
var domain = process.env['HEROKU_DOMAIN'] || '';
var conns = new Array();
var channels = new Array();
var cache = new Array();
var cache_length = 300;

Mu.templateRoot = './public';

exports.route_msg = function(channel, msg) {
  if (cache[channel].length > cache_length) cache[channel].shift();
  cache[channel].push(JSON.parse(msg));
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

exports.channel_sub = function(channel_obj) {
  var split = channel_obj.toString().split(':');
  var channel_raw = split[split.length-1];
  var channel_name = 'stats.' + channel_raw;
  console.log("init channel: " + channel_name);
  conns[channel_name] = new Array();
  if(cache[channel_name] == undefined)
    cache[channel_name] = new Array();  
  redis.subscribe(channel_name, function(msg) {
    exports.route_msg(channel_name, msg);
  });
  return channel_raw;
};

server.listen(websocket_port);

require('http').createServer(function (request, response) {
  console.log(request.url);
  if (request.url.match(/\.js$/) != null) {
    console.log('read public' + request.url);
    var file = fs.createReadStream('public' + request.url, {'encoding':'UTF-8'});
    response.writeHead(200, {'Content-Type': 'text/javascript'});
    file.addListener('data', function(data) {
      response.write(data.toString('utf8'));
    });
    file.addListener('end', function() {
      response.end();
    });
  } else if (request.url.match(/^\/[\w\d]+$/) != null) {
    var instance = request.url.substring(1, request.url.length);
    db.keys(domain + ':stats:' + instance + ':*', function(err, channel_list) {
      if(err) throw err;
      var datapoints = new Array();
      for(var i=0; i<channel_list.length; i++) {
        var channel_raw = exports.channel_sub(channel_list[i]);
        var channel_cache = cache['stats.' + channel_raw];
        var cache_money = new Array();
        for(channel_row in channel_cache) {
          var index = 0;
          for(item in channel_cache[channel_row]) {
            if(cache_money[index] == undefined)
              cache_money[index] = new Array();
            cache_money[index].push(channel_cache[channel_row][item]);
            index++;
          }
        }
        datapoints.push({"name": 'stats.' + channel_raw, "label": channel_raw, "data": sys.inspect(cache_money).toString()});
      }
      var view = {
        ws_host: process.env['LOCAL_IP'] || 'localhost',
        ws_port: websocket_port,
        channels: datapoints
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
    });
  } else {
    response.writeHead(404, {'Content-Type': 'text/html'});
    response.end('Not Found\n');
  }
}).listen(http_port, "0.0.0.0");
