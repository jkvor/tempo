require.paths.unshift(__dirname + '/lib');
require.paths.unshift(__dirname + '/node_modules/');
require.paths.unshift('./node_modules');

var fs = require('fs'),
    sys = require('sys'),
    ws = require('websocket-server/lib/ws/server'),
    server = ws.createServer(),
    redis = require('redis-helper'),
    db = redis.connection,
    Mu = require('mustache/mustache');

var websocket_port = parseInt(process.env['PORT'] || '8080');
var domain = process.env['HEROKU_DOMAIN'] || '';
var conns = new Array();
var subscriptions = new Array();
var channels = new Array();
var cache = new Array();
var cache_length = parseInt(process.env['CACHE_LENGTH'] ||  '50');

var canvas_stream = fs.createReadStream('public/canvas.html.mu', {'encoding':'UTF-8'});
var canvas_template;
canvas_stream.addListener('data', function(data) {
  canvas_template = data.toString('utf8');
});

server.addListener("connection", function(conn){
  conn.addListener("message", function(msg) {
    console.log("msg: " + msg.toString());
    var json = JSON.parse(msg);
    if (json.command == "open") {
      exports.open_conn(json.instance, conn);
    }
  });
  conn.addListener("close", function() {
    exports.close_conn(conn.id);
  });
});

exports.open_conn = function(instance, conn) {
  if (conns[instance] == undefined) {
    conns[instance] = new Array();
  }
  conns[instance].push(conn);
  db.keys(domain + ':stats:' + instance + ':*', function(err, channel_list) {
    if(err || channel_list == null) return;
    var datapoints = new Array();
    for(var i=0; i<channel_list.length; i++) {
      var channel_raw = exports.channel_sub(conn, instance, channel_list[i]);
      for(var row in cache[channel_raw]) {
        conn.write(cache[channel_raw][row]);
      }
    }
  });
}

exports.close_conn = function(conn_id) {
  for (var instance in conns) {
    //delete conns[i][j];
    for (var conn in conns[instance]) {
      if (conns[instance][conn].id == conn_id) {
        console.log('delete ' + conn_id);
        delete conns[instance][conn];
      }
    }
  }
};

exports.channel_sub = function(conn, instance, channel_obj) {
  var split = channel_obj.toString().split(':');
  var channel_raw = split[split.length-1];
  var channel_name = 'stats.' + channel_raw;
  console.log("init channel: " + channel_name);
  var view = {
    name: channel_raw,
    label: channel_name
  };
  conn.write(JSON.stringify({"channel": channel_raw, "command": "init", "html": Mu.to_html(canvas_template, view)}));
  if(cache[channel_raw] == undefined)
    cache[channel_raw] = new Array();
  if(subscriptions[channel_name] == undefined) {
    subscriptions[channel_name] = new Array();
    redis.subscribe(channel_name, function(msg) {
      exports.route_msg(instance, channel_raw, msg);
    });
  }
  subscriptions[channel_name].push(conn);
  return channel_raw;
};

exports.route_msg = function(instance, channel, msg) {
  var json = JSON.parse(msg);
  json['channel'] = channel;
  var new_msg = JSON.stringify(json);
  if (cache[channel].length > cache_length) cache[channel].shift();
  cache[channel].push(new_msg);
  for (var conn in conns[instance]) {
    //console.log('sending ' + new_msg + ' to ' + conns[instance][conn].id);
    conns[instance][conn].write(new_msg);
  }
};

console.log("domain " + domain);
console.log("websocket port " + websocket_port);
db.ping(function(msg, err) {
    console.log("redis ping " + msg + ", " + err);
});
server.listen(websocket_port);
