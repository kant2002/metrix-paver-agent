require('dotenv').config({path: '/home/pi/metrix-paver-agent/.env'});
var mysql       = require('mysql');
var gpio        = require('gpio');
var axios       = require("axios");
var serialport  = require('serialport');
var nmea        = require('nmea');
var redis       = require('redis');
var moment      = require('moment');
var Promise     = require('es6-promise').polyfill();
var Transmitter = require('./transmitter.js');
var Arduino     = require('./arduino.js');
var PCF8591     = require('pcf8591');
var exec = require('child_process').exec;

var arduino = new Arduino({});
var pcf8591 = new PCF8591('/dev/i2c-1', 0x48, 0x01);


var signalPin = {
  dowelGear  : {mute:false, duration: 20},
  dowelExist : {mute:false, duration: 20},
  dowelDip   : {mute:false, duration: 5000},
  tieExist   : {mute:false, duration: 2000},
  tieDip     : {mute:false, duration: 2000}
}


const WHEEL_R = 0.0022765;
var transmitter;
var positionFault = true;
var gearTimeout;

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
  exist: true,
  latitude: 0,
  longitude: 0,
  dipTime: null
};

var dowelCurrent = 0;

var tieBar = 0;

var systemHalted = false;

var DB = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

setTimeout(initialize, 7000);

function initialize(){
  var redisCli = redis.createClient();

  console.log('=------------------------------------------------------------------=');
  console.log('['+moment().format('DD MMM YYYY HH:mm')+'] System started')

  redisCli.on("error", function (err) {
      console.log("Redis-Error " + err);
  });




  arduino.on('shutdown', function(){
    var vSamples = 0;

    if(!systemHalted){
      setTimeout(function(){
        console.log('['+moment().format('DD MMM YYYY HH:mm')+'] System halting');
        console.log('-=============================================================-')
        exec("halt", function (error, stdout, stderr) {
          if (error !== null) {
            console.log('exec error: ' + error);
          }
        });
      },7000);
      pcf8591.readBytes(20,function(error, samples) {
        for (var i=0; i<20; i++){
          vSamples+=samples[i];
        }
        var voltage = Number(3.3/255.0*(vSamples/20)*9.4).toFixed(2);
        console.log('[Voltage]:', voltage);
        DB.query('UPDATE powerLog SET ? ORDER BY id DESC LIMIT 1', {endTime: new Date(), voltage:voltage}, function(err, rows){
          if(err){
            console.log('[DB:ERROR] paverLOG', err);
          }
        });
      });
      systemHalted = true;
    }
  });


  process.on('SIGINT', function() {
    console.log('SIGINT . . .');
    DB.destroy();
    redisCli.end(true);
    setTimeout(function() {
      process.exit(0);
    }, 300);
  });



  DB.connect(function(err) {
    if (err) {
      console.error('[ERROR] MYSQL connection failure: ' + err.stack);
      return;
    }
    console.log('[ OK  ] MYSQL connection estabilished :' + DB.threadId);
    transmitter = new Transmitter({
      remoteOrigin: process.env.REMOTE_ORIGIN || 'http://metrix.kz/',
      deviceId:     process.env.DEVICE_ID,
      DB: DB
    });


    DB.query('INSERT INTO powerLog SET ?', {beginTime: new Date()}, function(err, rows){
      if(err){
        console.log('[ERROR] DB power log data insertion failure', err);
      }
      if(rows){
        console.log('[ OK  ] System start time recorded succesfully');
      }
    });

    transmitter.sync();
  });



  var GPS_port = new serialport.SerialPort('/dev/u_blox', { baudrate: 9600, parser: serialport.parsers.readline('\r\n')}, false);
  GPS_port.open(function (err) {
    if (err) {
      return console.log('[ERROR] Opening port GPS: ', err.message);
    }
    var nmea_codes = ['GGA', 'GLL'];
    GPS_port.on('data', function(line) {
      try {
        var gis = nmea.parse(line);
        if(gis.sentence == 'GLL' && gis.lat.length){
          // console.log('GIS:', gis.lat, '  ', gis.lon)
          dowelRecord.latitude = tieRecord.latitude = parseFloat(gis.lat);
          dowelRecord.longitude = tieRecord.longitude = parseFloat(gis.lon);
        }
      } catch (e) {
          console.log('err', e);
      }
    });
  });


  var dowelGear = gpio.export(8, { // PIN 24 | CONN 3
     direction: "in",
     ready: function(){console.log('[READY] Sensor 3 | DowelGear');}
  });


  var dowelExist = gpio.export(25, { // PIN 22 | CONN 4
    direction: "in",
    ready: function(){console.log('[READY] Sensor 4 | DowelExist');}
  });

  var dowelDip = gpio.export(24, { // PIN 18 | CONN 5
     direction: "in",
     ready: function(){console.log('[READY] Sensor 5 | DowelDip');}
  });

  var tieExist = gpio.export(23, { // PIN:16 | CONN: 6
    direction: "in",
    ready: function(){console.log('[READY] Sensor 6 | TieExist');}
  });

  var tieDip = gpio.export(18, { // PIN:12 | CONN: 7
    direction: "in",
    ready: function(){console.log('[READY] Sensor 7 | TieDip');}
  });



  dowelGear.set();
  dowelExist.set();
  dowelDip.set();
  tieExist.set();
  tieDip.set();



  function gearStop(){
    if(dowelRecord.count < 33){
      console.log('[ALARM] '+(33-dowelRecord.count)+' bar(s) missing')
      arduino.alert(1);
    }
  }

  dowelGear.on("change", function(val){
    if(val == 0){
      if(!dowelRecord.startTime) dowelRecord.startTime = new Date();
      clearTimeout(gearTimeout);
      gearTimeout = setTimeout(gearStop, 4000);
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
      dowelRecord.finishTime = new Date();
      redisCli.get('dist', function(err, reply){
        dowelRecord.distance = parseInt(reply)*WHEEL_R;
        if(dowelRecord.distance > 1){
          DB.query('INSERT INTO setPoint SET ?', dowelRecord, function(err, rows){
            if(err){
              console.log('[DB:ERROR] setPoint insert', err);
            }
            // transmitter.sync(rows);
            if(rows){
              arduino.display(1, rows.insertId);
              dowelRecord = {
                distance: 0,
                count: 0,
                map: '',
                latitude: 0,
                longitude: 0,
                startTime: null,
                finishTime: null
              };
              console.log('['+moment().format('DD MMM YYYY HH:mm')+'] [Record] Set point saved: '+ rows.insertId);
            }
            redisCli.set('dist_flush', '1');
          });
        }
        else{
          dowelRecord = {
            distance: 0,
            count: 0,
            map: '',
            latitude: 0,
            longitude: 0,
            startTime: null,
            finishTime: null
          };
          redisCli.set('dist_flush', '1');
        }
      });
    }
  });

  tieExist.on("change", function(val){
    if((val == 0) && (signalPin.tieExist.mute == false)){
      muteSignal('tieExist');
      tieRecord.exist = true;
    }
  });


  function tieCheck(){
    if(!tieRecord.exist){
      console.log('[ALARM] Tie bar does not exist');
      arduino.alert(3);
      //Alert
    }
  }

  tieDip.on("change", function(val){
    if((val == 0) && (signalPin.tieDip.mute == false)){
      tieRecord.dipTime = new Date();
      muteSignal('tieDip');
      setTimeout(tieCheck, 11000);
      redisCli.get('tiedist', function(err, reply){
        tieRecord.distance = parseInt(reply)*WHEEL_R;
        if(tieRecord.distance > 0.2){
          DB.query('INSERT INTO tiePoint SET ?', tieRecord, function(err, rows){
            if(err){
              console.log('[DB:ERROR] tiePoint insert', err);
            }
            if(rows){
              arduino.display(3, rows.insertId);
              tieRecord = {
                distance: 0,
                exist: false,
                latitude: 0,
                longitude: 0,
                dipTime: null
              };
              console.log('['+moment().format('DD MMM YYYY HH:mm')+'] [Record] Tie bar saved: '+ rows.insertId);
              redisCli.set('tiedist_flush', '1');
            }
            // transmitter.sync(rows);
          });
        }
        else{
          tieRecord = {
            distance: 0,
            exist: false,
            latitude: 0,
            longitude: 0,
            dipTime: null
          };
          redisCli.set('tiedist_flush', '1');
        }
      });
     }
  });

  setInterval(function(){
    redisCli.get('tiedist', function(err, reply){
      arduino.display(2, Math.abs(Number((parseInt(reply)*WHEEL_R).toFixed(3)*1000))+'');
    });
  }, 2500);
}


function muteSignal(pin){
  signalPin[pin].mute = true;
  setTimeout(function(){
    signalPin[pin].mute = false;
  }, signalPin[pin].duration);
}
