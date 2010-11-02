<html>
  <head>
    <script type="text/javascript" src="https://www.google.com/jsapi"></script>
    <script type="text/javascript">
      google.load("visualization", "1", {packages:["imagesparkline"]});
      google.setOnLoadCallback(ready);
      
      function open_sock(channel) {
        var ws = new WebSocket("ws://{{ws_host}}:{{ws_port}}");
        var datapoints = new Array();
        ws.onopen = function() {
            console.log("websocket connected!");
            ws.send(JSON.stringify({'channel': channel}));
         };
         ws.onmessage = function (evt) {
            var receivedMsg = evt.data;
            console.log('recvd ' + receivedMsg);
            var num = eval(receivedMsg);
            if (datapoints.length > 100) datapoints.shift();
            datapoints.push({c:[{v: parseInt(num)}]});
            drawChart(datapoints, channel);
         };
         ws.onclose = function() {
            // websocket was closed
            console.log("websocket was closed");
         };
        
      }

      function ready() {
        if ("WebSocket" in window) {
           {{#instances}}
             open_sock('{{name}}');
           {{/instances}}
        } else {
           console.log("sorry, your browser does not support websockets.");
        };
      }
      
      function drawChart(rows, id) {
        var JSONObject = {
              cols: [{id: 'reqs', label: 'Requests', type: 'number'}],
              rows: rows
        };
        var data = new google.visualization.DataTable(JSONObject, 0.5);
        var chart = new google.visualization.ImageSparkLine(document.getElementById(id));
        chart.draw(data, {width: 1000, height: 200, showAxisLines: true, showValueLabels: true, fill: true, min: 0});
      }
    </script>
  </head>
  <body>
    {{#instances}}
    <div id="{{name}}"></div>
    {{/instances}}
  </body>
</html>
