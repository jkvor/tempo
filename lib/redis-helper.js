var url   = require("url");
var sys   = require("sys");

var redis_url = (process.env['REDIS_URL'] || "redis://127.0.0.1:6379/");
var redis = url.parse(redis_url);
var redis_client = require("node_redis/index");

exports.connect = function() {
  sys.log("REDIS: redis_client.createClient(" + (redis.port || 6379) +","+ redis.hostname +")");
  var client = redis_client.createClient(redis.port || 6379 , redis.hostname);
  sys.log("connecting to db: " + redis_url);
  if (redis.auth) {
    auth(client);
    client.on('reconnecting', function(newclient) {
      sys.log('redis client reconnecting');
      auth(client);
    });
  }
  return client;
}

exports.subscribe = function(exchange, msg_handler, teardown_handler) {
  var subcon = exports.connect();
  if (teardown_handler) teardown_handler(subcon);
  subcon.on("message", function(channel,msg) { if (channel == exchange) msg_handler(msg) });
  subcon.subscribe(exchange);
}

var auth = function(client) {
  client.auth(redis.auth, function(err, data) {
    sys.log("REDIS AUTH: " + sys.inspect(err) + " " + sys.inspect(data));
    if (err) throw Error(err);
    sys.log("authed to db: " + redis_url);
  });
}

exports.connection = exports.connect();
