<html>
  <head>
    <script type="text/javascript" src="/scripts/RGraph.common.core.js"></script>
    <script type="text/javascript" src="/scripts/RGraph.line.js"></script>
    <script type="text/javascript">
      var cache_length = 300;
      window.onload = function () {
        if ("WebSocket" in window) {
           {{#channels}}
             open_sock('{{name}}', []);
           {{/channels}}
        } else {
           console.log("sorry, your browser does not support websockets.");
        };
      }
 
      function open_sock(channel, datapoints) {
        var requests = new Array();
        var errors = new Array();
        /*for(datapoint in datapoints) {
          requests.push(datapoints[datapoint].requests);
          errors.push(datapoints[datapoint].errors);
        }
        if (requests.length > 0)
          drawChart(channel, requests, errors);
        */

        var ws = new WebSocket("ws://{{ws_host}}:{{ws_port}}");
        ws.onopen = function() {
            console.log("websocket connected!");
            ws.send(JSON.stringify({'channel': channel}));
         };
         ws.onmessage = function (evt) {
            var receivedMsg = evt.data;
            var json = JSON.parse(receivedMsg);
            if (requests.length > cache_length) requests.shift();
            requests.push(parseInt(json.requests ? json.requests : 0));
            document.getElementById(channel + "_num_requests").innerHTML = json.requests;
            if (errors.length > cache_length) errors.shift();
            errors.push(parseInt(json.errors ? json.errors : 0));
            document.getElementById(channel + "_num_errors").innerHTML = json.errors;
            drawChart(channel, requests, errors);
         };
         ws.onclose = function() {
            // websocket was closed
            console.log("websocket was closed");
         };
      }

      function drawChart(id, data1, data2) {
        RGraph.Clear(document.getElementById(id));
        var line = new RGraph.Line(id, data1, data2);
        line.Set('chart.hmargin', 5);
        line.Set('chart.noaxes', true);
        line.Set('chart.backdrop', true);
        line.Set('chart.backdrop.size', 5);
        line.Set('chart.backdrop.alpha', 0.5);
        line.Set('chart.linewidth', 2);
        line.Set('chart.ylabels.inside', true);
        line.Set('chart.colors', ['GREEN', 'RED']);
        line.Draw();
      }
    </script>
  </head>
  <body>
    {{#channels}}
    <canvas id="{{name}}" width="1000" height="150" style="float: left; margin: 0px; padding: 0px;">[No canvas support]</canvas>
    <div style="float: left;">
      <div style="margin-top: 20px; font-size: 1.4em; color: BLUE;">{{label}}</div>
      <div style="margin-top: 2px; font-size: 1.6em; color: GREEN;"><span id="{{name}}_num_requests"></span> req/s</div>
      <div style="margin-top: 2px; font-size: 1.6em; color: RED;"><span id="{{name}}_num_errors"></span> err/s</div>
    </div>
    <div style="clear: both;"></div>
    {{/channels}}
  </body>
</html>