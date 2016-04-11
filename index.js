require('dotenv').load();
var mysql  = require('promise-mysql');
var gpio   = require('gpio');
var axios  = require("axios");

var DB;
var crawlerSpace = 10;

var positionFault = true;

var distance = 0;
var dowelMap = '';
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
    dowelMap += dowelCurrent;
    dowelCurrent = 0;
  }
});

dowelDip.on("change", function(val){
  if(val == 0){
    console.log('Distance: ', distance);
    console.log('Dowels:   ', dowelMap);
  }
});


crawlerHead.on("change", function(val) {
   // value will report either 1 or 0 (number) when the value changes
   if(positionFault){
     positionFault = false;
     return 0;
   }

   if(val == 1){
     if(crawlerTail.value == 0){
       distance += crawlerSpace/4;
       console.log('>>>1 ', distance);
     }
     else{
       distance -= crawlerSpace/4;
       console.log('<<<1 ', distance);
     }
   }
   else {
     if(crawlerTail.value == 0){
       distance -= crawlerSpace/4;
       console.log('<<<2 ', distance);
     }
     else{
       distance += crawlerSpace/4;
       console.log('>>>2 ', distance);
     }
   }
});

crawlerTail.on("change", function(val) {
   // value will report either 1 or 0 (number) when the value changes

   if(positionFault){
     positionFault = false;
     return 0;
   }

   if(val == 0){
     if(crawlerHead.value == 0){
       distance += crawlerSpace/4;
       console.log('>>>3 ', distance);
     }
     else{
       distance -= crawlerSpace/4;
       console.log('<<<3 ', distance);
     }
   }
   else {
     if(crawlerHead.value == 0){
       distance -= crawlerSpace/4;
       console.log('<<<4 ', distance);
     }
     else{
       distance += crawlerSpace/4;
       console.log('>>>4 ', distance);
     }
   }
});


mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
}).then(function(connection){
  DB = connection;
  // return DB.query('SELECT * FROM yield ORDER BY id DESC LIMIT 1');
}).catch(function(err){
  console.log('ERROR: ', err);
});
