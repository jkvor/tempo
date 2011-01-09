<html>
  <head>
    <script type="text/javascript" src="/scripts/RGraph.common.core.js"></script>
    <script type="text/javascript" src="/scripts/RGraph.line.js"></script>
    <script type="text/javascript">
      var cache_length = 300;
      window.onload = function () {
        if ("WebSocket" in window) {
           {{#channels}}
             open_sock('{{name}}', {{data}});
           {{/channels}}
        } else {
           console.log("sorry, your browser does not support websockets.");
        };
      }
 
      function open_sock(channel, data) {
        var labels_div = document.getElementById(channel + '_labels');
        var ws = new WebSocket("ws://{{ws_host}}:{{ws_port}}");
        ws.onopen = function() {
            console.log("websocket connected!");
            ws.send(JSON.stringify({'channel': channel}));
         };
         ws.onmessage = function (evt) {
            var receivedMsg = evt.data;
            var json = JSON.parse(receivedMsg);
            labels_div.innerHTML = '';
            var index = 0;
            for(foo in json) {
              if(data[index] == undefined) {
                data[index] = new Array(); 
              } else {
                if (data[index].length > cache_length)
                  data[index].shift();
              }
              labels_div.innerHTML += (foo + ': ' + json[foo] + '/sec<br/>');
              data[index].push(json[foo]); 
              index++;
            } 
            drawChart(channel, data);
         };
         ws.onclose = function() {
            // websocket was closed
            console.log("websocket was closed");
         };
      }

      function drawChart(id, data) {
        RGraph.Clear(document.getElementById(id));
        var line = new RGraph.Line(id);
        for (var i=0; i<data.length; i++) {
            line.original_data[i] = RGraph.array_clone(data[i]);
        }
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
    <div>
      <canvas id="{{name}}" width="1000" height="150" style="float: left; margin: 0px; padding: 0px;">[No canvas support]</canvas>
      <div style="float: left; margin-left: 10px;">
        <div style="margin-top: 20px; font-size: 1.4em; color: BLUE;">{{label}}</div>
        <div id="{{name}}_labels" style="margin-top: 2px; font-size: 1.2em; color: BLUE;"></div>
      </div>
      <div style="clear: both;"></div>
    </div>
    {{/channels}}
  </body>
</html>