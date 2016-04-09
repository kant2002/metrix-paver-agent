var util = require('util')
var exec = require('child_process').exec;
var child;

function shutdown(){
  child = exec("halt", function (error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
    }
  });
}
var aliveText="alive!";
var elapsed=0;
setInterval(function(){
elapsed++;
  //console.log("time is "+ elapsed);
  if (elapsed>30){
    console.log("shutdowning");
    shutdown();
  }
}, 1000);

var serialLib =require("serialport");
var SerialPort = serialLib.SerialPort;

var nanoPort = new SerialPort("/dev/ttyAMA0", {
  baudrate: 9600,
  parser: serialLib.parsers.readline("\r\n")
}, true);

nanoPort.open(function (error) {
  if ( error ) {
    console.log('failed to open: '+error);
  }
  console.log('opened port Nano');
  //inform ardunio that i'm alive
  setTimeout(sendAlive,5000);


  nanoPort.on('data', function(data) {
    if (data==aliveText){
      console.log('a: ', new Date());
      //console.log("reset timer");
      elapsed=0;
    }
  });
});

function sendAlive(){
  nanoPort.write(aliveText);
}
