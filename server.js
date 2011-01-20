require.paths.unshift(__dirname + '/node_modules/');

var fs = require('fs'),
    sys = require('sys'),
    http = require('http'),
    Mu = require('mustache/index');

var http_port = parseInt(process.env['PORT'] || '8001');
var websocket_port = parseInt(process.env['WEBSOCKET_PORT'] || '8080');
var tempo_password = process.env['TEMPO_PASSWORD'] || 'password';

var index_stream = fs.createReadStream('public/index.html.mu', {'encoding':'UTF-8'});
var index_template;
index_stream.addListener('data', function(data) {
  index_template = data.toString('utf8');
});

exports.decodeBase64 = function(headerValue) {
    var value;
    if (value = headerValue.match("^Basic\\s([A-Za-z0-9+/=]+)$")) {
        var auth = (new Buffer(value[1] || "", "base64")).toString("ascii");
        return {
            username : auth.slice(0, auth.indexOf(':')),
            password : auth.slice(auth.indexOf(':') + 1, auth.length)
        };
    } else {
        return null;
    }
};

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
    if (!request.headers['authorization']) {
      response.writeHead(401, {'WWW-Authenticate': 'Basic realm="Secure Area"'});
      response.end();
      return;
    } else {
      var auth = exports.decodeBase64(request.headers['authorization']);
      if (!auth || !auth.username || auth.password != tempo_password) {
        response.writeHead(401, {'WWW-Authenticate': 'Basic realm="Secure Area"'});
        response.end();
        return;
      }
    }
    var instance = request.url.substring(1, request.url.length);
    var view = {
      ws_host: process.env['LOCAL_IP'] || 'localhost',
      ws_port: websocket_port,
      instance: instance
    };
    response.writeHead(200, {'Content-Type': 'text/html'});
    response.end(Mu.to_html(index_template, view));
  } else {
    response.writeHead(404, {'Content-Type': 'text/html'});
    response.end('Not Found\n');
  }
}).listen(http_port, "0.0.0.0");
