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

var redisCli = redis.createClient();

var arduino = new Arduino();


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

  transmitter.sync();
})

var cRadius = 0.22765;
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
      console.log('GIS:', gis.lat, '  ', gis.lon)
      // dowelRecord.latitude = tieRecord.latitude = parseFloat(gis.lat);
      // dowelRecord.longitude = tieRecord.longitude = parseFloat(gis.lon);
    }
  } catch (e) {
      console.log('err', e);
  }
});



var signalPin = {
  dowelGear  : {mute:false, duration: 350},
  dowelExist : {mute:false, duration: 350},
  dowelDip   : {mute:false, duration: 350},
  tieExist   : {mute:false, duration: 350},
  tieDip     : {mute:false, duration: 350}
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



dowelGear.on("change", function(val){
  if(val == 0){
    // dowlRecord.dowelMap += dowelCurrent;
    // dowelCurrent = 0;
  }
});

dowelExist.on("change", function(val){
  if(val == 0 && !signalPin.dowelExist.mute){
    muteSignal('dowelExist')
    dowelCurrent = 1;
    dowelRecord.count++;
    arduino.display(0, dowelRecord.count+'33');
  }
});


dowelDip.on("change", function(val){
  if(val == 0 && !signalPin.dowelDip.mute){
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
          redisCli.set('dist_flush', '1');
        }

      });
    });
  }
});

tieExist.on("change", function(val){
  if(val == 0 && !signalPin.tieExist.mute){
    muteSignal('tieExist');
    console.log('Tie Exist: ');
    tieRecord.exist = true;
  }
});

var tieo = 0;
tieDip.on("change", function(val){
  if(val == 0 && !signalPin.tieDip.mute){
    console.log('tie ', tieo++);
    muteSignal('tieDip');
  //   tieRecord.dipTime = new Date();
  //   redisCli.get('dist', function(err, reply){
  //     tieRecord.distance = parseInt(reply)*cRadius;
  //     DB.query('INSERT INTO tiePoint SET ?', tieRecord, function(err, rows){
  //       if(err){
  //         console.log('[DB:ERROR] tiePoint insert', err);
  //       }
  //
  //       if(rows){
  //         var tieRecord = {
  //           distance: 0,
  //           exist: false,
  //           latitude: 0,
  //           longitude: 0,
  //           dipTime: null
  //         };
  //         console.log('*   TIE RECORD SAVED!', rows.insertId);
  //         console.log('---------------------------------------')
  //       }
  //       // transmitter.sync(rows);
  //
  //     });
  //   });
  // }
});

function muteSignal(pin){
  signalPin[pin].mute = true;
  setTimeout(function(){
    signalPin[pin].mute = false;
  }, signalPin[pin].duration);
}
