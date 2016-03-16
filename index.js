'use strict'
var __ = require('lodash');
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
	this.dbOpts = ['mysql', 'oracle'];
	this.initHandler = null;
	this.loadHandler = null;

	if (!__.isBoolean(this.config.build)){
		this.config.build = true;
	}
	if (!__.isBoolean(this.config.append)){
		this.config.append = false;
	}
	if (!this.config.schemas){
		throw new Error('no schemas set');
	}

	if (!this.config.db || __.indexOf(this.dbOpts, this.config.db) == -1 ) {
		console.warn('since no db set, use mysql as default.');
		this.config.db = 'mysql';
	}
	if (this.config.db == this.dbOpts[0]) {
		_packageTest ('mysql');

		var mysql = {};
		mysql.initDB = require('./mysql/init_database');
		mysql.loadDB = require('./mysql/load_data');

		this.initHandler = mysql.initDB.initDatabases;
		this.loadHandler = mysql.loadDB.loadData;
	}
	if (this.config.db == this.dbOpts[1]) {
		_packageTest ('oracledb');

		var oracle = {};
		oracle.initDB = require('./oracle/init_database');
		oracle.loadDB = require('./oracle/load_data');

		this.initHandler = oracle.initDB.initDatabases;
		this.loadHandler = oracle.loadDB.loadData;
	}

	return this;
}

xlsdb.prototype.constructor = xlsdb;

xlsdb.prototype.init = function(cb){
	this.initHandler(this.config.path, this.config.build, cb);
};

xlsdb.prototype.load = function(cb){
	this.loadHandler(this.config.path, this.config.schemas, this.config.append, cb);
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
