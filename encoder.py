#!/usr/bin/env python2.7
# script by Alex Eames http://RasPi.tv
import RPi.GPIO as GPIO
import redis
GPIO.setmode(GPIO.BCM)

# GPIO 23 & 17 set up as inputs, pulled up to avoid false detection.
# Both ports are wired to connect to GND on button press.
# So we'll be setting up falling edge detection for both
GPIO.setup(13, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
GPIO.setup(19, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

distance=0
head = 0;
tail = 0;

def head_rise(channel):
    global distance
    global head
    head = 1

    if tail == 0:
        distance-=1
        print distance
    else:
        distance+=1
        print distance

def head_fall(channel):
    global distance
    global head
    head = 0
    if tail == 0:
        distance+=1
        print distance
    else:
        distance-=1
        print distance

def tail_rise(channel):
    global distance
    global tail
    tail = 1
    if head == 0:
        distance+=1
        print distance
    else:
        distance-=1
        print distance
def tail_fall(channel):
    global distance
    global tail
    tail = 0
    if head == 0:
        distance-=1
        print distance
    else:
        distance+=1
        print distance


# when a falling edge is detected on port 17, regardless of whatever
# else is happening in the program, the function my_callback will be run
GPIO.add_event_detect(13, GPIO.RISING, callback=head_rise)
GPIO.add_event_detect(13, GPIO.FALLING, callback=head_fall)
GPIO.add_event_detect(19, GPIO.RISING, callback=tail_rise)
GPIO.add_event_detect(19, GPIO.FALLING, callback=tail_fall)

# when a falling edge is detected on port 23, regardless of whatever
# else is happening in the program, the function my_callback2 will be run
# 'bouncetime=300' includes the bounce control written into interrupts2a.py
#GPIO.add_event_detect(19, GPIO.RISING, callback=my_callback2)

raw_input("Press Enter when ready\n>")
GPIO.cleanup()           # clean up GPIO on normal exit
