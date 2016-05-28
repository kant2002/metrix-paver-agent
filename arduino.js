var util = require('util')


var serialLib =require("serialport");
var SerialPort = serialLib.SerialPort;
var EventEmitter = require('events').EventEmitter;

var nanoPort = new SerialPort("/dev/ttyAMA0", {
  baudrate: 9600,
  parser: serialLib.parsers.readline("\r")
}, true);

var displayPad = '0000';


function Arduino(options){
  var elapsed=0;
  var self = this;
  setInterval(function(){
  elapsed++;
    if (elapsed>30){
      self.emit('shutdown');
    }
  }, 1000);

  this.dowelBar = options.dowelBar ? options.dowelBar : '0033';
  this.setPointId = options.setPointId ? options.setPointId : '0000';
  this.distance = options.distance ? options.distance : '00.00';
  this.tieBarId = options.tieBarId ? options.tieBarId : '0000';

  var self = this;
  nanoPort.open(function (error) {
    if (error) {
      console.log('failed to open: '+error);
    }
    console.log('[SERIAL PORT] opened');
    nanoPort.on('data', function(data) {
      var command = data.split('=');
      console.log('data:', command);
      if (command[0] == 'x'){
        if(command[1] == 'flush'){
          var msg = '';
          msg += (0+'='+self.dowelBar+'\r');
          msg += (1+'='+self.setPointId+'\r');
          msg += (2+'='+self.distance+'\r');
          msg += (3+'='+self.tieBarId+'\r');
          console.log(msg);
          nanoPort.write(msg);
        }
        else if(command[1] == 'alive'){
          elapsed=0;
        }
      }
    });
    setInterval(sendAlive, 5000);
  });
};

Arduino.prototype = new EventEmitter();

Arduino.prototype.display = function(index, data, alert){
  data = ''+data;
  result = displayPad.substring(0, displayPad.length - data.length) + data;
  result = result.substring(result.length - displayPad.length);
  var sign = alert ? '*' : '!';
  console.log('nanoWrite:', index+sign+result);
  nanoPort.write(index+sign+result+'\r');
};

function sendAlive(){
  nanoPort.write('x=alive\r');
};


function shutdown(){
  child = exec("halt", function (error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
    }
  });
};

module.exports = Arduino;
