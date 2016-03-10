'use strict'

var mysqlInitDB = require('./mysql/init_database');
//var mysqlInitSH = require('./mysql/init_schema');

exports.mysqlInitDB = function(cfg, build, cb) {
  	mysqlInitDB.initDatabases(cfg, build, cb);
}

exports.mysqlInitSH = function(cfg, schemas, append, cb) {
  	//mysqlInitSH.loadData(cfg, schemas, append, cb);
}


var oracleInitDB = require('./oracle/init_database');
var oracleInsert = require('./oracle/insert_data');

exports.oracleInitDB = function(cfg, build, cb) {
  	oracleInitDB.initDatabases(cfg, build, cb);
}

exports.oracleInsert = function(cfg, schemas, append, cb) {
  	oracleInsert.loadData(cfg, schemas, append, cb);
}



