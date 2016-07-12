var mysql       = require('mysql');
var axios       = require("axios");
var moment      = require('moment');
// var Promise     = require('es6-promise').polyfill();
var Transmitter = require('../transmitter.js');


var transmitter;

var DB = mysql.createConnection({
  host: "192.168.10.10",
  port: 3306,
  user: "homestead",
  password: "secret",
  database: "homestead"
});


DB.connect(function(err) {
  if (err) {
    console.error('[ERROR] MYSQL connection failure: ' + err.stack);
    return;
  }
  console.log('[ OK  ] MYSQL connection estabilished :' + DB.threadId);
  transmitter = new Transmitter({
    remoteOrigin: 'http://127.0.0.1:3000/',
    deviceId:     2251,
    DB: DB
  });

  transmitter.sync();
});
