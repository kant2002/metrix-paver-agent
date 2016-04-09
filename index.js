var gpio = require('gpio');



var dowelGear  = 29; // GPIO 5
var dowelExist = 31; // GPIO 6
var dowelDip   = 27; // GPIO 26
var caterpillarHead = 33; //GPIO 13
var caterpillarTail = 35; //GPIO 19

var gpio4 = gpio.export(35, {
   direction: "in",
   ready: function() {
     console.log('ready');
   }
});


gpio4.on("change", function(val) {
   // value will report either 1 or 0 (number) when the value changes
   console.log('--', val)
});
