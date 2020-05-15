// import { createConnection } from 'mysql';
var mysql = require('mysql');
// var createConnection = require('mysql');

var conn = mysql.createConnection({
  connectionLimit : 1,
  host: "localhost",
  user: "root",
  password: "123456",
  multipleStatements: true
});

var query = conn.query("CREATE DATABASE IF NOT EXISTS sensorDb; USE sensorDb; CREATE TABLE IF NOT EXISTS sensor (time_stamp VARCHAR(255) PRIMARY KEY,soil_moisture INT,light_intensity INT,distance INT)");

query
  .on('fields', function(fields, index) {
  })
  .on('error', function(error) {
    console.log("Connection Error: conn.js");
  })
  .on('success', function(row, index) {
});

conn.end();

var pool = mysql.createPool({
  connectionLimit : 10,
  host: "localhost",
  user: "root",
  password: "123456",
  multipleStatements: true,
  timezone: "+8:00",
  database: "sensorDb"
});

module.exports = pool;