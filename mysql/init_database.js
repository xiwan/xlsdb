'use strict'

var mysql      = require('mysql');
var util       = require('util');
var xlsx       = require('xlsx');
var async      = require('async');

global.argv = require('optimist').argv;

var iFile = xlsx.readFile('../test/schema/mysql/systems.xlsx');
var schemas = {};
iFile.SheetNames.forEach(function(name) {
    var sheet = iFile.Sheets[name];
    schemas[name] = xlsx.utils.sheet_to_row_object_array(sheet);
});

async.eachSeries(schemas.Database, createDatabase, function(err){
	err && console.warn(err.message);
	process.exit(0);
});

function createDatabase(schema, cb) {
    var connection = mysql.createConnection({
        host     : global.argv.host || schema.Host,
        user     : 'root',
        password : 'pa$$w0rd'
    });
    connection.connect();
    var qry = util.format('CREATE SCHEMA `%s` DEFAULT CHARACTER SET utf8', schema.Name);
    connection.query(qry, function(err) {
        if (err && err.code !== 'ER_DB_CREATE_EXISTS') {
            connection.end();
            throw err;
        }

        var qry = getTableQry(schema.Name, 'DataVersion', schemas.DataVersion);
        connection.query(qry, function(err) {
            if (err && err.code !== 'ER_TABLE_EXISTS_ERROR') {
                connection.end();
                throw err;
            }
            console.log('finish create database: %s, user: %s', schema.Name, schema.User);

            createUser(connection, schema, function(err){
            	connection.end();
            	cb(err);
            });
        });
    });
}

function getTableQry(schema, name, obj) {
	var cols = [], key = [];
    obj.forEach(function(col) {
        cols.push(util.format('`%s` %s %s NULL COMMENT "%s"', col.Name, col.DataType, col.IsNull?'NOT':'', col.Description));
        col.IsKey && key.push(util.format('`%s`', col.Name));
    });
    return util.format('CREATE TABLE `%s`.`%s` (\n  %s,\n PRIMARY KEY (%s))\n ENGINE = InnoDB', schema, name, cols.join(',\n  '), key.join(','));
}


function createUser(connection, schema, cb) {
	var qry1 = util.format('CREATE USER "%s"@"%" IDENTIFIED BY "%s";', schema.User, schema.Password);
	var qry2 = util.format('GRANT ALL PRIVILEGES ON *.* TO "%s"@"%" WITH GRANT OPTION;', schema.User);
	var qry3 = util.format('CREATE USER "%s"@"localhost" IDENTIFIED BY "%s";', schema.User, schema.Password);
	var qry4 = util.format('GRANT ALL PRIVILEGES ON *.* TO "%s"@"localhost" WITH GRANT OPTION;', schema.User);
	async.series([
		function(callback) {connection.query(qry1, callback)},
		function(callback) {connection.query(qry2, callback)},
		function(callback) {connection.query(qry3, callback)},
		function(callback) {connection.query(qry4, callback)},
	], function(err){
        if (err && err.code !== 'ER_CANNOT_USER')
            throw err;
        cb(null);
	});
}