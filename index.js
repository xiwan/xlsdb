'use strict'

var mysqlInitDB = require('./mysql/init_database');
var mysqlLoadDB = require('./mysql/load_data');

exports.mysqlInitDB = function(cfg, build, cb) {
  	mysqlInitDB.initDatabases(cfg, build, cb);
}

exports.mysqlLoadDB = function(cfg, schemas, append, cb) {
  	mysqlLoadDB.loadData(cfg, schemas, append, cb);
}

var oracleInitDB = require('./oracle/init_database');
var oracleLoadDB = require('./oracle/load_data');

exports.oracleInitDB = function(cfg, build, cb) {
  	oracleInitDB.initDatabases(cfg, build, cb);
}

exports.oracleLoadDB = function(cfg, schemas, append, cb) {
  	oracleLoadDB.loadData(cfg, schemas, append, cb);
}



