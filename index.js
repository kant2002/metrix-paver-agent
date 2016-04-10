var gpio = require('gpio');




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
