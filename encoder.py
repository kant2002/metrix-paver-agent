#!/usr/bin/env python2.7
# script by KemengerLAB
import RPi.GPIO as GPIO
import redis
import time
import threading
GPIO.setmode(GPIO.BCM)

# GPIO 13 & 19 set up as inputs, pulled up to avoid false detection.
# Both ports are wired to connect to GND on button press.
# So we'll be setting up falling edge detection for both
GPIO.setup(13, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
GPIO.setup(19, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

distance=0
dis_reset=0

rd = redis.StrictRedis(host='localhost', port=6379, db=0)
rd.set('dist', 0)

def persist():
    global distance
    while 1:
        if rd.get('dist_flush') == '1':
            distance = 0
            rd.set('dist_flush', '0')
        rd.set('dist',distance)
        time.sleep(0.5)

def head_gpio(channel):
    global distance
    if GPIO.input(13):
        if GPIO.input(19) == 0:
            distance+=1
        else:
            distance-=1
    else:
        if GPIO.input(19) == 0:
            distance-=1
        else:
            distance+=1

def tail_gpio(channel):
    global distance
    if GPIO.input(19):
        if GPIO.input(13) == 0:
            distance-=1
        else:
            distance+=1
    else:
        if GPIO.input(13) == 0:
            distance+=1
        else:
            distance-=1


GPIO.add_event_detect(13, GPIO.BOTH, callback=head_gpio)
GPIO.add_event_detect(19, GPIO.BOTH, callback=tail_gpio)
thread=threading.Thread(target=persist)
thread.daemon = True
thread.start()
GPIO.cleanup()           # clean up GPIO on normal exit
