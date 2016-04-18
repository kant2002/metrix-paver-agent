require('dotenv').load();
var mysql       = require('mysql');
var gpio        = require('gpio');
var axios       = require("axios");
var serialport  = require('serialport');
var nmea        = require('nmea');
var redis       = require('redis');
var Promise     = require('es6-promise').polyfill();
var Transmitter = require('./transmitter.js');

var redisCli = redis.createClient();

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




// var port = new serialport.SerialPort('/dev/ttyACM0', {
//                 baudrate: 9600,
//                 parser: serialport.parsers.readline('\r\n')});
//
// var nmea_codes = ['GGA', 'GLL'];
//
// var nmea_codes_arr = [];
//
// port.on('data', function(line) {
//   try {
//     // console.log('NMEA:', nmea.parse(line));
//     var gis = nmea.parse(line);
//
//     if(nmea_codes_arr.indexOf(gis.sentence) == -1){
//       nmea_codes_arr.push(gis.sentence);
//     }
//
//     if(nmea_codes.indexOf(gis.sentence) > -1){
//       console.log(gis.sentence, '--------------------------');
//       console.log('lat:', gis.lat);
//       console.log('lon:', gis.lon);
//       if(gis.type) console.log('type:', gis.type);
//       if(gis.fixType) console.log('fix-type:', gis.fixType);
//       if(gis.status) console.log('status', gis.status);0
//     }
//
//
//   } catch (e) {
//       console.log('err', e);
//   }
// });
//
// setInterval(function(){
//   console.log('NMEA CODES: ', nmea_codes_arr);
//
// },5000);

var cRadius = 0.22765;
var crawlerSpace = 10; //constant
var positionFault = true;

var record = {
  distance: 0,
  dowelMap: '',
  latitude: 0,
  longitude: 0,
  startTime: null,
  finishTime: null
};
var dowelCurrent = 0;


var dowelExist = gpio.export(26, { // PIN 27
   direction: "in",
   ready: function() {
     console.log('ready');
   }
});

var dowelGear = gpio.export(5, { // PIN 29
   direction: "in",
   ready: function() {
     console.log('ready');
   }
});

var dowelDip = gpio.export(6, { // PIN 31
   direction: "in",
   ready: function() {
     console.log('ready');
   }
});


dowelExist.on("change", function(val){
  if(val == 0){
    dowelCurrent = 1;
  }
});

dowelGear.on("change", function(val){
  if(val == 0){
    console.log('dowel: ',dowelCurrent);
    record.dowelMap += dowelCurrent;
    dowelCurrent = 0;
  }
});

dowelDip.on("change", function(val){
  if(val == 0){
    console.log('Distance: ', record.distance);
    console.log('Dowels:   ', record.dowelMap);
    record.finishTime = new Date();
    redisCli.get('dist', function(err, reply){
      record.distance = parseInt(reply)*cRadius;
      DB.query('INSERT INTO paverTrace SET ?', record, function(err, rows){
        console.log(err, rows);
        transmitter.sync(rows);
        record = {
          distance: 0,
          dowelMap: '',
          latitude: 0,
          longitude: 0,
          startTime: null,
          finishTime: null
        };
        console.log('RECORD SAVED!');
        redisCli.set('dist_flush', '1');
      });
    });
  }
});
