require('dotenv').config({path: '/home/pi/metrix-paver-agent/.env'});
var mysql       = require('mysql');
var gpio        = require('gpio');
var axios       = require("axios");
var serialport  = require('serialport');
var nmea        = require('nmea');
var redis       = require('redis');
var Promise     = require('es6-promise').polyfill();
var Transmitter = require('./transmitter.js');
var Arduino     = require('./arduino.js');
var PCF8591     = require('pcf8591');
var exec = require('child_process').exec;
var redisCli = redis.createClient();
var arduino = new Arduino({});
var pcf8591 = new PCF8591('/dev/i2c-1', 0x48, 0x01);



arduino.on('shutdown', function(){
  var vSamples = 0;
  pcf8591.readBytes(20,function(error, samples) {
    for (var i=0; i<20; i++){
      vSamples+=samples[i];
    }
    var voltage = Number(3.3/255.0*(vSamples/20)*9.4).toFixed(2);
    console.log('VOLTAGE:', voltage);
    DB.query('UPDATE powerLog SET ? ORDER BY id DESC LIMIT 1', {endTime: new Date(), voltage:voltage}, function(err, rows){
      if(err){
        console.log('[DB:ERROR] paverLOG', err);
      }
      if(rows){
        console.log('SHUTDOWN');
        exec("halt", function (error, stdout, stderr) {
          if (error !== null) {
            console.log('exec error: ' + error);
          }
        });
      }
    });
  });
});


var DB = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

DB.connect(function(err) {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }
  console.log('connected as id ' + DB.threadId);
  var transmitter = new Transmitter({
    remoteOrigin: process.env.REMOTE_ORIGIN || 'http://metrix.kz/',
    deviceId:     process.env.DEVICE_ID,
    DB: DB,
  })


  DB.query('INSERT INTO powerLog SET ?', {beginTime: new Date()}, function(err, rows){
    if(err){
      console.log('[DB:ERROR] paverLOG', err);
    }
    if(rows){
      console.log('BEGINTIME FIXED');
    }
  });


  transmitter.sync();
})

var cRadius = 0.0022765;
var crawlerSpace = 10; //constant
var positionFault = true;

var dowelRecord = {
  distance: 0,
  count: 0,
  map: '',
  latitude: 0,
  longitude: 0,
  startTime: null,
  finishTime: null
};

var tieRecord = {
  distance: 0,
  exist: false,
  latitude: 0,
  longitude: 0,
  dipTime: null
};

var dowelCurrent = 0;

var tieBar = 0;

var GPS_port = new serialport.SerialPort('/dev/ttyACM0', {
                baudrate: 9600,
                parser: serialport.parsers.readline('\r\n')});

var nmea_codes = ['GGA', 'GLL'];

GPS_port.on('data', function(line) {
  try {

    var gis = nmea.parse(line);

    if(gis.sentence == 'GLL' && gis.lat.length){
      // console.log('GIS:', gis.lat, '  ', gis.lon)
      // dowelRecord.latitude = tieRecord.latitude = parseFloat(gis.lat);
      // dowelRecord.longitude = tieRecord.longitude = parseFloat(gis.lon);
    }
  } catch (e) {
      console.log('err', e);
  }
});



var signalPin = {
  dowelGear  : {mute:false, duration: 20},
  dowelExist : {mute:false, duration: 20},
  dowelDip   : {mute:false, duration: 20},
  tieExist   : {mute:false, duration: 20},
  tieDip     : {mute:false, duration: 20}
}


var dowelGear = gpio.export(8, { // PIN 24 | CONN 3
   direction: "in",
   ready: function(){console.log('ready');}
});


var dowelExist = gpio.export(25, { // PIN 22 | CONN 4
  direction: "in",
  ready: function(){console.log('ready');}
});

var dowelDip = gpio.export(24, { // PIN 18 | CONN 5
   direction: "in",
   ready: function(){console.log('ready');}
});

var tieExist = gpio.export(23, { // PIN:16 | CONN: 6
  direction: "in",
  ready: function(){console.log('ready');}
});

var tieDip = gpio.export(18, { // PIN:12 | CONN: 7
  direction: "in",
  ready: function(){console.log('ready');}
});



dowelGear.set();
dowelExist.set();
dowelDip.set();
tieExist.set();
tieDip.set();


dowelGear.on("change", function(val){
  if(val == 0){
    // dowlRecord.dowelMap += dowelCurrent;
    // dowelCurrent = 0;
  }
});

dowelExist.on("change", function(val){
  if((val == 0) && (signalPin.dowelExist.mute == false)){
    muteSignal('dowelExist')
    dowelCurrent = 1;
    dowelRecord.count++;
    arduino.display(0, dowelRecord.count+'33');
  }
});


dowelDip.on("change", function(val){
  if((val == 0) && (signalPin.dowelDip.mute == false)){
    muteSignal('dowelDip');
    console.log('Distance: ', dowelRecord.distance);
    console.log('Dowels:   ', dowelRecord.dowelMap);
    dowelRecord.finishTime = new Date();
    redisCli.get('dist', function(err, reply){
      dowelRecord.distance = parseInt(reply)*cRadius;
      DB.query('INSERT INTO setPoint SET ?', dowelRecord, function(err, rows){
        if(err){
          console.log('[DB:ERROR] setPoint insert', err);
        }
        // transmitter.sync(rows);
        if(rows){
          arduino.display(1, rows.insertId, dowelRecord.count != 33);
          dowelRecord = {
            distance: 0,
            count: 0,
            map: '',
            latitude: 0,
            longitude: 0,
            startTime: null,
            finishTime: null
          };
          console.log('*** SET POINT RECORD SAVED!', rows.insertId);
          console.log('=======================================')

        }
        redisCli.set('dist_flush', '1');
      });
    });
  }
});

tieExist.on("change", function(val){
  if((val == 0) && (signalPin.tieExist.mute == false)){
    muteSignal('tieExist');
    console.log('Tie Exist: ');
    tieRecord.exist = true;
  }
});

var tieo = 0;
tieDip.on("change", function(val){
  if((val == 0) && (signalPin.tieDip.mute == false)){
    console.log('tie ', tieo++);
    muteSignal('tieDip');
    tieRecord.dipTime = new Date();
    redisCli.get('tiedist', function(err, reply){
      tieRecord.distance = parseInt(reply)*cRadius;
      DB.query('INSERT INTO tiePoint SET ?', tieRecord, function(err, rows){
        if(err){
          console.log('[DB:ERROR] tiePoint insert', err);
        }
        if(rows){
          arduino.display(3, rows.insertId, !tieRecord.exist);
          tieRecord = {
            distance: 0,
            exist: false,
            latitude: 0,
            longitude: 0,
            dipTime: null
          };
          console.log('*  TIE RECORD SAVED!', rows.insertId);
          console.log('---------------------------------------');
          redisCli.set('tiedist_flush', '1');
        }
        // transmitter.sync(rows);

      });
    });
   }
});


setInterval(function(){
  redisCli.get('tiedist', function(err, reply){
    console.log('tiedist', Number((parseInt(reply)*cRadius).toFixed(3)*1000)+'');
    arduino.display(2, Math.abs(Number((parseInt(reply)*cRadius).toFixed(3)*1000))+'');
  });
}, 4000)

function muteSignal(pin){
  signalPin[pin].mute = true;
  setTimeout(function(){
    signalPin[pin].mute = false;
  }, signalPin[pin].duration);
}
