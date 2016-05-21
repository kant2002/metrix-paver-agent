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
    if(nmea_codes.indexOf(gis.sentence) > -1){
      dowelRecord.latitude = gis.lat;
      record.longitude =  gis.lon;
    }
  } catch (e) {
      console.log('err', e);
  }
});






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
  if(val == 0){
    dowelCurrent = 1;
    dowelRecord.count++;
    arduino.display(0, dowelRecord.count+'33');
  }
});


dowelDip.on("change", function(val){
  if(val == 0){
    console.log('Distance: ', dowelRecord.distance);
    console.log('Dowels:   ', dowelRecord.dowelMap);
    dowelRecord.finishTime = new Date();
    redisCli.get('dist', function(err, reply){
      dowelRecord.distance = parseInt(reply)*cRadius;
      DB.query('INSERT INTO setPoint SET ?', dowelRecord, function(err, rows){
        console.log('set-point', err, rows);
        if(err){
          console.log('[DB:ERROR] setPoint insert' err);
        }
        // transmitter.sync(rows);
        dowlRecord = {
          distance: 0,
          count: 0,
          map: '',
          latitude: 0,
          longitude: 0,
          startTime: null,
          finishTime: null
        };
        console.log('SET POINT RECORD SAVED!', rows);
        DB.query('SELECT MAX(id) FROM setPoint', function(err, rows){
          if(err){
            console.log('[DB:ERROR] setPoint last select', err);
          }
          console.log('set_max_ID',rows);
        });
        redisCli.set('dist_flush', '1');
      });
    });
  }
});

tieExist.on("change", function(val){
  if(val == 0){
    console.log('Tie Exist: ');
    tieRecord.exist = true;
  }
});

tieDip.on("change", function(val){
  if(val == 0){
    tieRecord.dipTime = new Date();
    redisCli.get('dist', function(err, reply){
      tieRecord.distance = parseInt(reply)*cRadius;
      DB.query('INSERT INTO tiePoint SET ?', tieRecord, function(err, rows){
        console.log('tie-point', err, rows);
        // transmitter.sync(rows);
        var tieRecord = {
          distance: 0,
          exist: false,
          latitude: 0,
          longitude: 0,
          dipTime: null
        };
        console.log('TIE RECORD SAVED!', rows);
        DB.query('SELECT MAX(id) FROM tiePoint', function(err, rows){
          if(err){
            console.log('[DB:ERROR] setPoint last select', err);
          }
          console.log('tie_max_ID',rows);
        });
      });
    });
  }
});
