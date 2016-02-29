'use strict'

var oracleInitDB = require('./oracle/init_database');
var oracleInsert = require('./oracle/insert_data');

exports.oracleInitDB = function(cfg, build, cb) {
  oracleInitDB.initDatabases(cfg, build, cb);
}

exports.oracleInsert = function(cfg, schemas, append, cb) {
  oracleInsert.loadData(cfg, schemas, append, cb);
}



