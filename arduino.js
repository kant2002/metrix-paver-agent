var util = require('util')
var exec = require('child_process').exec;
var child;

var serialLib =require("serialport");
var SerialPort = serialLib.SerialPort;

var nanoPort = new SerialPort("/dev/ttyAMA0", {
  baudrate: 9600,
  parser: serialLib.parsers.readline("\r\n")
}, true);

var displayPad = '0000';


function Arduino(options){
  // var aliveText="alive!";
  // var elapsed=0;
  // setInterval(function(){
  // elapsed++;
  //   //console.log("time is "+ elapsed);
  //   if (elapsed>30){
  //     console.log("shutdowning");
  //     shutdown();
  //   }
  // }, 1000);
  //
  // nanoPort.open(function (error) {
  //   if (error) {
  //     console.log('failed to open: '+error);
  //   }
  //   console.log('[SERIAL PORT] opened');
  //   setInterval(sendAlive, 1000);
  //   nanoPort.on('data', function(data) {
  //     if (data==aliveText){
  //       console.log('a: ', new Date());
  //       //console.log("reset timer");
  //       elapsed=0;
  //     }
  //   });
  // });
};

Arduino.prototype.display = function(index, data){
  data = ''+data;
  result = displayPad.substring(0, displayPad.length - data.length) + data;
  result = result.substring(result.length - displayPad.length);
  nanoPort.write(index+'='+result+'\r\n');
};

function sendAlive(){
  nanoPort.write('aline=true\r\n');
};


function shutdown(){
  child = exec("halt", function (error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
    }
  });
};

module.exports = Arduino;
