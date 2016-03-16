'use strict'
var __          = require('lodash');

var mysqlInitDB = require('./mysql/init_database');
var mysqlLoadDB = require('./mysql/load_data');
var oracleInitDB = require('./oracle/init_database');
var oracleLoadDB = require('./oracle/load_data');

/*
var config = {
	path : '/path/to/config.ini',
	db : 'mysql',
	schemas : 'gameAdmin1',
	build : true,
	append : false
}
*/

function xlsdb(config) {
	this.config = config;
	if (!__.isBoolean(this.config.build)){
		this.config.build = true;
	}
	if (!__.isBoolean(this.config.append)){
		this.config.append = false;
	}
	if (!this.config.db || __.indexOf(['mysql', 'oracle'], this.config.db) == -1 ) {
		console.warn('since no db set, use mysql as default.');
		this.config.db = 'mysql';
	}	
	if (!this.config.schemas){
		throw new Error('no schemas set');
	}

	return this;
}

xlsdb.prototype.constructor = xlsdb;

xlsdb.prototype.init = function(cb){
	var config = this.config;
	if(config.db == 'mysql') {
		return mysqlInitDB.initDatabases(config.path, config.build, cb);
	}
	if(config.db == 'oracle') {
		return oracleInitDB.initDatabases(config.path, config.build, cb);
	}	
};

xlsdb.prototype.load = function(cb){
	var config = this.config;
	if(config.db == 'mysql') {
		return mysqlLoadDB.loadData(config.path, config.schemas, config.append, cb);
	}
	if(config.db == 'oracle') {
		return oracleLoadDB.loadData(config.path, config.schemas, config.append, cb);
	}
};

module.exports.create = function(config){
	return new xlsdb(config);
};
