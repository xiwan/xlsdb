'use strict'
var __ 			= require('lodash');
var ini 		= require('ini');
var fs 			= require('fs');
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
	if (!config.path || !config.schemas) {
		throw new Error('path and shcemas props are required!');
	}

	this.config = config;
	this.dbOpts = ['mysql', 'oracle'];
	this.initHandler = null;
	this.loadHandler = null;
	this.config = __.extend(this.config, ini.parse(fs.readFileSync(this.config.path, 'utf-8')));

	if (!__.isBoolean(this.config.build)){
		this.config.build = true;
	}
	if (!__.isBoolean(this.config.append)){
		this.config.append = false;
	}

	if (!this.config.db || __.indexOf(this.dbOpts, this.config.db) == -1 ) {
		console.warn('since no db set, use mysql as default.');
		this.config.db = 'mysql';
	}

	if (!this.config.sysConn) {
		this.config.sysConn = 'systems.xlsx';
	}


	if (this.config.db == this.dbOpts[0]) {
		if (!this.config[this.dbOpts[0]]) {
		    throw new Error('no configuration!');  
		}
		_packageTest ('mysql');

		var mysql = {};
		mysql.initDB = require('./mysql/init_database');
		mysql.loadDB = require('./mysql/load_data');

		this.initHandler = mysql.initDB.initDatabases;
		this.loadHandler = mysql.loadDB.loadData;
	}
	if (this.config.db == this.dbOpts[1]) {
		if (!this.config[this.dbOpts[1]]) {
		    throw new Error('no configuration!');  
		}
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
	this.initHandler.apply(this, arguments);
};

xlsdb.prototype.load = function(cb){
	this.loadHandler.apply(this, arguments);
};

function _packageTest(name) {
	var pkg = null;
	var pkgV = null;
	try {
	    pkg = require(name);
	    pkgV = require(name + '/package.json').version
	} catch (ex) {
	    mysql = null;
	}
	if (!pkg && !pkgV) {
	    throw new Error('Please install ' + name + ' first');
	}
}

module.exports.create = function(config){
	return new xlsdb(config);
};
