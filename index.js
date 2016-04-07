var gpio = require('rpi-gpio');



var dowelGear  = 29; // GPIO 5
var dowelExist = 31; // GPIO 6
var dowelDip   = 27; // GPIO 26
var caterpillarHead = 33; //GPIO 13
var caterpillarTail = 35; //GPIO 19

gpio.on('change', function(channel, value) {
    console.log('Channel ' + channel + ' value is now ' + value);
});
gpio.setup(caterpillarHead, gpio.DIR_IN, gpio.EDGE_BOTH);
