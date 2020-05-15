'use strict';

var pool = require('./conn.js');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const Ready = require('@serialport/parser-ready');
const moment = require('moment');
var devicepath, sport, myInterval;

/*
This function will search for valid usb based serial port and assign the available serial port to a variable for further processing
*/
function searchPort(){
    SerialPort.list().then(
        port => port.forEach(element => {
            var pattern = RegExp("/dev/tty[USB]\\d\*");
            if(pattern.test(element.path) == true){
                devicepath = element.path;
                console.log("> Connecting with USB Path: " + devicepath)
                connectArd();
                return true;
            }
            else
                return false;
        }),
        err => {
            console.error("Search Port Error: ");
            return false;
        }
    )
};

searchPort();

/*
This function will manage serial port connection
*/
var connectArd = function() {
    sport = new SerialPort(devicepath, { 
        baudRate: 9600,
        autoOpen: true
    });

    console.log("> Arduino Connected!");

    //Stop peroidic execution of myInterval function
    clearInterval(myInterval);
    //Send ready signal to the arduino and waits for the confirmation
    var parser = sport.pipe(new Ready({ delimiter: 'READY' }));
    parser.on('ready', () => console.log('the ready byte sequence has been received'));
    //Parse the data received from the arduino with newline as the delimiter
    parser = sport.pipe(new Readline({ delimiter: '\r\n' }));

    /* On received data, we format the received data from the arduino
    *  with the current timestamp and save it to the mysql database
    */
    sport.on('data', line => {
        var regex = RegExp('^\\d{1,4},\\d{1,4},\\d{1,4}');
        if((regex.test(line.toString()))) {
            //Make our date with time +8:00 according to our Malaysian time zone
            var dataWithTime = moment().add( 8, 'hours' ).toISOString() + "," + line.toString();
            var splitedData =  dataWithTime.split(',');
            
            pool.query('INSERT INTO sensor SET time_stamp = ?, soil_moisture = ?, light_intensity = ?, distance = ?', splitedData, function (error, results, fields){
                // connection.release();
                if(error){
                    console.log("SQL Insert Error" + error);
                    return;
                }
            });

            //Check if soil moisture level is less than 100 out of 900+
            if (splitedData[1] < 100){
                sport.write('water\n');
                sport.write('dry\n');
            }
            else
                sport.write('wet\n');

            //Check if intruder is within 10 cm out of 400
            if (splitedData[3] < 10){
                sport.write('intruded\n');
            }
            else
                sport.write('safe\n');
        }
        sport.resume();
    });

    //On closed port, we will call function to manage the reconnection for every 5 second
    sport.on('close', err => {
        console.error('> ARDUINO PORT CLOSED');
        reconnectArd();
        myInterval = setInterval(reconnectArd, 5000);
    });
    //On error, we will call function to manage the reconnection for every 5 second
    sport.on('error', err => {
        console.error("> On Error");
        reconnectArd();
        myInterval = setInterval(reconnectArd, 5000);
    });
};

/*
This function will manage serial port reconnection
*/
var reconnectArd = function () {
    console.log('> INITIATING RECONNECT');
    setTimeout(function(){
        console.log('> RECONNECTING TO ARDUINO...');
        searchPort();
    }, 1000);
};