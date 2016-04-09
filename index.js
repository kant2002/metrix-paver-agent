var gpio = require('gpio');



var dowelGear  = 29; // GPIO 5
var dowelExist = 31; // GPIO 6
var dowelDip   = 27; // GPIO 26

var crawlerSpace = 10;

var cArr = [];

var cHead = 0;
var cTail = 0;


var positionFault = true;
var distance = 0;

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


  //  if(val == 1){
  //    if(cHead == 0) cHead = 1;
  //    else {
  //      if(cHead == 1){
  //        console.log('step stop backward | ', crawlerTail.value);
  //      }
  //      else {
  //        console.log('step backward      | ', crawlerTail.value);
  //      }
  //     cHead = 0;
  //    }
  //  }



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

  //  if(val == 1){
  //    if(cHead == 0) cHead = 2;
  //    else {
  //      if(cHead == 2){
  //        console.log('step stop forward  | ', crawlerHead.value);
  //      }
  //      else {
  //        console.log('step forward       | ', crawlerHead.value);
  //      }
  //      cHead = 0;
  //    }
  //  }




});
