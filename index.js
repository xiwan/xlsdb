'use strict'
var __          = require('lodash');

// var mysqlInitDB = require('./mysql/init_database');
// var mysqlLoadDB = require('./mysql/load_data');
// var oracleInitDB = require('./oracle/init_database');
// var oracleLoadDB = require('./oracle/load_data');

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
	this.mysql = {};
	this.oracle = {};

	if (!__.isBoolean(this.config.build)){
		this.config.build = true;
	}
	if (!__.isBoolean(this.config.append)){
		this.config.append = false;
	}
	if (!this.config.schemas){
		throw new Error('no schemas set');
	}

	if (!this.config.db || __.indexOf(['mysql', 'oracle'], this.config.db) == -1 ) {
		console.warn('since no db set, use mysql as default.');
		this.config.db = 'mysql';
	}
	if (this.config.db == 'mysql') {
		_packageTest ('mysql');
		this.mysql.initDB = require('./mysql/init_database');
		this.mysql.loadDB = require('./mysql/load_data');
	}
	if (this.config.db == 'oracle') {
		_packageTest ('oracledb');
		this.oracle.initDB = require('./oracle/init_database');
		this.oracle.loadDB = require('./oracle/load_data');
	}

	return this;
}

xlsdb.prototype.constructor = xlsdb;

xlsdb.prototype.init = function(cb){
	var config = this.config;
	if(config.db == 'mysql') {
		return this.mysql.initDB.initDatabases(config.path, config.build, cb);
	}
	if(config.db == 'oracle') {
		return this.oracle.initDB.initDatabases(config.path, config.build, cb);
	}	
};

xlsdb.prototype.load = function(cb){
	var config = this.config;
	if(config.db == 'mysql') {
		return this.mysql.loadDB.loadData(config.path, config.schemas, config.append, cb);
	}
	if(config.db == 'oracle') {
		return this.oracle.loadDB.loadData(config.path, config.schemas, config.append, cb);
	}
};

function _packageTest(name) {
	var pkg = null;
	var pkgV = 0;
	try {
	    pkg = require(name);
	    pkgV = require(name + '/package.json').version
	} catch (ex) {
	    mysql = null;
	}
	if (!pkg && !pkgV) {
	    throw new Error('Please install ' + name + ' first');
	    return;
	}
}

module.exports.create = function(config){
	return new xlsdb(config);
};
