#!/usr/bin/env python2.7
# script by KemengerLAB
import RPi.GPIO as GPIO
import redis
import time
import threading
GPIO.setmode(GPIO.BCM)

# GPIO   PIN   CONNNECTOR
# ----- ----- -----------
#  12    32     1
#   7    26     2

GPIO.setup(12, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(7, GPIO.IN, pull_up_down=GPIO.PUD_UP)

distance=0
tiedistance=0
dis_reset=0

rd = redis.StrictRedis(host='localhost', port=6379, db=0)
rd.set('dist', 0)
rd.set('tiedist', 0)

def persist():
    global distance
    global tiedistance
    while 1:
        print("tiedisto: "+str(tiedistance))
        if rd.get('dist_flush') == '1':
            distance = 0
            rd.set('dist_flush', '0')

        if rd.get('tiedist_flush') == '1':
            tiedistance = 0
            rd.set('tiedist_flush', '0')

        rd.set('dist',distance)
        rd.set('tiedist',tiedistance)
        time.sleep(0.5)

def head_gpio(channel):
    global distance
    global tiedistance
    if GPIO.input(7):
        if GPIO.input(12) == 0:
            distance+=1
            tiedistance+=1
        else:
            distance-=1
            tiedistance-=1
    else:
        if GPIO.input(12) == 0:
            distance-=1
            tiedistance-=1
        else:
            distance+=1
            tiedistance+=1

def tail_gpio(channel):
    global distance
    global tiedistance
    if GPIO.input(12):
        if GPIO.input(7) == 0:
            distance-=1
            tiedistance-=1
        else:
            distance+=1
            tiedistance+=1
    else:
        if GPIO.input(7) == 0:
            distance+=1
            tiedistance+=1
        else:
            distance-=1
            tiedistance-=1


GPIO.add_event_detect(12, GPIO.BOTH, callback=head_gpio)
GPIO.add_event_detect(7, GPIO.BOTH, callback=tail_gpio)
thread=threading.Thread(target=persist)
thread.start()
thread.join()

def sigterm_handler(_signo, _stack_frame):
    "When sysvinit sends the TERM signal, cleanup before exiting."
    print("[" + get_now() + "] received signal {}, exiting...".format(_signo))
    GPIO.cleanup()
    sys.exit(0)

signal.signal(signal.SIGTERM, sigterm_handler)

          # clean up GPIO on normal exit
