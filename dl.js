require('dotenv').config({path: '/home/pi/metrix-paver-agent/.env'});
var mysql       = require('mysql');
var axios       = require("axios");
var moment      = require('moment');
var Promise     = require('es6-promise').polyfill();
var Transmitter = require('./transmitter.js');


var DB = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
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

  transmitter.sync();
});
