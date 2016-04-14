#!/usr/bin/env python2.7
# script by Alex Eames http://RasPi.tv
import RPi.GPIO as GPIO
import redis
import time
import threading
GPIO.setmode(GPIO.BCM)

# GPIO 23 & 17 set up as inputs, pulled up to avoid false detection.
# Both ports are wired to connect to GND on button press.
# So we'll be setting up falling edge detection for both
GPIO.setup(13, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
GPIO.setup(19, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

distance=0
thread=threading.Thread(target=persist)

rd = redis.StrictRedis(host='localhost', port=6379, db=0)
rd.set('dist', 0)

def persist():
    while 1:
        rd.set('dist',distance)
        time.sleep(500)

def head_gpio(channel):
    global distance
    if GPIO.input(13):
        if GPIO.input(19) == 0:
            distance+=1
            print distance
        else:
            distance-=1
            print distance
    else:
        if GPIO.input(19) == 0:
            distance-=1
            print distance
        else:
            distance+=1
            print distance

def tail_gpio(channel):
    global distance
    if GPIO.input(19):
        if GPIO.input(13) == 0:
            distance-=1
            print distance
        else:
            distance+=1
            print distance
    else:
        if GPIO.input(13) == 0:
            distance+=1
            print distance
        else:
            distance-=1
            print distance



# when a falling edge is detected on port 17, regardless of whatever
# else is happening in the program, the function my_callback will be run
GPIO.add_event_detect(13, GPIO.BOTH, callback=head_gpio)
GPIO.add_event_detect(19, GPIO.BOTH, callback=tail_gpio)
thread.start();
# when a falling edge is detected on port 23, regardless of whatever
# else is happening in the program, the function my_callback2 will be run
# 'bouncetime=300' includes the bounce control written into interrupts2a.py
#GPIO.add_event_detect(19, GPIO.RISING, callback=my_callback2)

raw_input("Press Enter when ready\n>")
GPIO.cleanup()           # clean up GPIO on normal exit
