<html>
  <head>
    <script type="text/javascript" src="/scripts/RGraph.common.core.js"></script>
    <script type="text/javascript" src="/scripts/RGraph.line.js"></script>
    <script type="text/javascript">
      window.onload = function () {
        if ("WebSocket" in window) {
           {{#instances}}
             open_sock('{{name}}');
           {{/instances}}
        } else {
           console.log("sorry, your browser does not support websockets.");
        };
      }
 
      function open_sock(channel) {
        var ws = new WebSocket("ws://{{ws_host}}:{{ws_port}}");
        var datapoints = new Array();
        ws.onopen = function() {
            console.log("websocket connected!");
            ws.send(JSON.stringify({'channel': channel}));
         };
         ws.onmessage = function (evt) {
            var receivedMsg = evt.data;
            var num = eval(receivedMsg);
            if (datapoints.length > 100) datapoints.shift();
            datapoints.push(parseInt(num));
            drawChart(datapoints, channel);
         };
         ws.onclose = function() {
            // websocket was closed
            console.log("websocket was closed");
         };
      }

      function drawChart(datapoints, id) {
	RGraph.Clear(document.getElementById(id));
	var line = new RGraph.Line(id, datapoints);
	line.Set('chart.hmargin', 5);
        line.Set('chart.noaxes', true);
        line.Set('chart.backdrop', true);
        line.Set('chart.backdrop.size', 5);
        line.Set('chart.backdrop.alpha', 0.5);
        line.Set('chart.linewidth', 2);
        line.Draw();
      }
    </script>
  </head>
  <body>
    {{#instances}}
    <canvas id="{{name}}" width="1000" height="150">[No canvas support]</canvas> 
    {{/instances}}
  </body>
</html>
