<html>
  <head>
    <script type="text/javascript" src="/scripts/RGraph.common.core.js"></script>
    <script type="text/javascript" src="/scripts/RGraph.line.js"></script>
    <script type="text/javascript">
      var cache_length = 300;
      window.onload = function () {
        if ("WebSocket" in window) {
           open_sock('{{instance}}');
        } else {
           console.log("sorry, your browser does not support websockets.");
        };
      }
 
      function open_sock(instance) {
        var ws = new WebSocket("ws://{{ws_host}}:{{ws_port}}");
        var datasets = new Array();
        ws.onopen = function() {
            console.log("websocket connected!");
            ws.send(JSON.stringify({'command': 'open', 'instance': instance}));
         };
         ws.onmessage = function (evt) {
            var receivedMsg = evt.data;
            var json = JSON.parse(receivedMsg);
            if (json.command == "init") {
              datasets[json.channel] = new Array();
              var newdiv = document.createElement("div");
              newdiv.innerHTML = json.html
              document.body.appendChild(newdiv);
            } else {
              var channel = json.channel;
              var labels_div = document.getElementById(channel + '_labels');
              labels_div.innerHTML = '';
              var index = 0;
              for(foo in json) {
                if(foo != "channel") {
                  if(datasets[channel][index] == undefined) {
                    datasets[channel][index] = new Array(); 
                  } else {
                    if (datasets[channel][index].length > cache_length)
                      datasets[channel][index].shift();
                  }
                  labels_div.innerHTML += (foo + ': ' + json[foo] + '/sec<br/>');
                  datasets[channel][index].push(json[foo]); 
                  index++;
                }
              }
              drawChart(channel, datasets[channel]);
            }
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
        line.Set('chart.colors', ['GREEN', 'RED', 'BLUE', 'PURPLE', 'ORANGE', 'YELLOW']);
        line.Draw();
      }
    </script>
  </head>
  <body>
  </body>
</html>
