require('dotenv').load();
var mysql  = require('mysql');
var gpio   = require('gpio');
var axios  = require("axios");

var DB = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

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


var dowelExist = gpio.export(6, { // PIN 31
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

var dowelDip = gpio.export(26, { // PIN 27
   direction: "in",
   ready: function() {
     console.log('ready');
   }
});

var crawlerHead = gpio.export(13, { // PIN 33
   direction: "in",
   ready: function() {
     crawlerHead.set(1);
     console.log('ready', crawlerHead.value);
   }
});

var crawlerTail = gpio.export(19, { // PIN 35
   direction: "in",
   ready: function() {
     crawlerTail.set(1);
     console.log('ready', crawlerTail.value);
   }
});



dowelExist.on("change", function(val){
  if(val == 0){
    dowelCurrent = 1;
  }
});

dowelGear.on("change", function(val){
  if(val == 0){
    record.dowelMap += dowelCurrent;
    dowelCurrent = 0;
  }
});

dowelDip.on("change", function(val){
  if(val == 0){
    console.log('Distance: ', record.distance);
    console.log('Dowels:   ', record.dowelMap);
    record.finishTime = new Date();
    DB.query('INSERT INTO paverTrace SET ?', record).then(function(err, rows){
      console.log(err, rows);
      record = {
        distance: 0,
        dowelMap: '',
        latitude: 0,
        longitude: 0,
        startTime: null,
        finishTime: null
      };
      // lastRecord = record;
      // oldTime = record.actualDate;
      // wait();
    })

  }
});


crawlerHead.on("change", function(val) {
   // value will report either 1 or 0 (number) when the value changes
   if(positionFault){
     positionFault = false;
     return 0;
   }

   if(!record.startTime) record.startTime = new Date();

   if(val == 1){
     if(crawlerTail.value == 0){
       record.distance += crawlerSpace/4;
       console.log('>>>1 ', record.distance);
     }
     else{
       record.distance -= crawlerSpace/4;
       console.log('<<<1 ', record.distance);
     }
   }
   else {
     if(crawlerTail.value == 0){
       record.distance -= crawlerSpace/4;
       console.log('<<<2 ', record.distance);
     }
     else{
       record.distance += crawlerSpace/4;
       console.log('>>>2 ', record.distance);
     }
   }
});

crawlerTail.on("change", function(val) {
   // value will report either 1 or 0 (number) when the value changes

   if(positionFault){
     positionFault = false;
     return 0;
   }

   if(!record.startTime) record.startTime = new Date();

   if(val == 0){
     if(crawlerHead.value == 0){
       record.distance += crawlerSpace/4;
       console.log('>>>3 ', record.distance);
     }
     else{
       record.distance -= crawlerSpace/4;
       console.log('<<<3 ', record.distance);
     }
   }
   else {
     if(crawlerHead.value == 0){
       record.distance -= crawlerSpace/4;
       console.log('<<<4 ', record.distance);
     }
     else{
       record.distance += crawlerSpace/4;
       console.log('>>>4 ', record.distance);
     }
   }
});

DB.query('SELECT * from paverTrace', function(err, rows) {
  console.log('--',rows)
  // connected! (unless `err` is set)
});
