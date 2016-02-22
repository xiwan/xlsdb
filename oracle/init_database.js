'use strict'

var fs 			= require('fs');
var util       	= require('util');
var oracledb    = require('oracledb');
var xlsx       	= require('xlsx');
var async      	= require('async');
var ini 		= require('ini');

global.argv = require('optimist').argv;

var config = ini.parse(fs.readFileSync(global.argv.cfg, 'utf-8'));
if (!config.oracle) {
	console.warn('no configuration!');
	process.exit(0);
}

var iFile = xlsx.readFile(config.oracle.baseDir + '/systems.xlsx');
var schemas = {};
iFile.SheetNames.forEach(function(name) {
    var sheet = iFile.Sheets[name];
    schemas[name] = xlsx.utils.sheet_to_row_object_array(sheet);
});

async.series([
	function(callback) {
		console.log('start database ...');
		async.eachSeries(schemas.Database, createDatabase, callback);
	},
	function(callback) {
		console.log('start schema ...');
		async.eachSeries(schemas.Database, createSchema, callback);
	}
],
function(err, results){
	err && console.warn(err.message);
	console.log('done!');
	process.exit(0);
});

function createDatabase(schema, cb){
	oracledb.getConnection({
		user : config.oracle.user,
		password : config.oracle.password,
		connectString : config.oracle.connectString
	}, function (err, connection){
		if (err) { 
			console.error(err.message); 
			cb(err);
			return; 
		}

		createUser(connection, schema, function(err, result){
			if(err) {
				console.error(err.message); 
				cb(err);
				return; 
			}
			connection.release(cb);		
		});

	});
};

function createSchema(schema, cb) {
	oracledb.getConnection({
		user : schema.User,
		password : schema.Password,
		connectString : config.oracle.connectString
	}, function (err, connection){
		if (err) { 
			console.error(err.message); 
			cb(err);
			return; 
		}

		var comments = [];
		var name = util.format(config.oracle.baseDir + '/%s.xlsx', schema.Name);
		var iFile = xlsx.readFile(name);
		var tables = {};
		iFile.SheetNames.forEach(function(name) {
            var sheet = iFile.Sheets[name];
            tables[name] = xlsx.utils.sheet_to_row_object_array(sheet);
        });

		async.series([
			function(callback) {
				var qry = util.format('CREATE SCHEMA AUTHORIZATION %s ', schema.User);
				qry += getTableQry(schema.Name, 'DataVersion', schemas.DataVersion);
				comments = comments.concat(getCommentQry(schema.Name, 'DataVersion', schemas.DataVersion));
				connection.execute(qry, callback);
			},
			function(callback) {
		        async.eachSeries(tables['Domain'], function(table, cbk){
		        	var qry = getTableQry(schema.Name, table.TableName, tables[table.TableName]);
		        	comments = comments.concat(getCommentQry(schema.Name, table.TableName, tables[table.TableName]));
		        	connection.execute(qry, cbk);
		        }, callback);
			},
			function(callback) {
				async.eachSeries(comments, function(qry, cbk){
					connection.execute(qry, cbk);
				}, callback);
			}

		], function(err, result){
			if (err){
				console.error(err.message);
			}
			connection.release(cb);
		});

	});
}

function getTableQry(schema, name, obj) {
	var cols = [], key = [];
    obj.forEach(function(col) {
        cols.push(util.format('%s %s %s NULL', col.Name, col.DataType, col.IsNull?'NOT':''));
        col.IsKey && key.push(util.format('%s', col.Name));
    });
    var createSql = util.format('CREATE TABLE %s.%s (\n  %s,\n PRIMARY KEY (%s)) ', schema, name, cols.join(',\n  '), key.join(',')); 
    return createSql;
}

function getCommentQry(schema, name, obj) {
	var cols = [], key = [];
    obj.forEach(function(col) {
    	cols.push(util.format('COMMENT ON COLUMN %s.%s is \'%s\'', name, col.Name, col.Description));
    });	
    return cols;
}

function createUser(connection, schema, cb) {

	var qrys = [];
	qrys.push(util.format('DROP USER %s CASCADE', schema.User));
	qrys.push(util.format('CREATE USER %s IDENTIFIED BY %s DEFAULT TABLESPACE tbs_perm_01 TEMPORARY TABLESPACE tbs_temp_01 QUOTA 20M on tbs_perm_01', schema.User, schema.Password));
	qrys.push(util.format('GRANT create session TO %s', schema.User));
	qrys.push(util.format('GRANT create table TO %s', schema.User));
	qrys.push(util.format('GRANT create view TO %s', schema.User));
	qrys.push(util.format('GRANT create any trigger TO %s', schema.User));
	qrys.push(util.format('GRANT create any procedure TO %s', schema.User));
	qrys.push(util.format('GRANT create sequence TO %s', schema.User));
	qrys.push(util.format('GRANT create synonym TO %s', schema.User));
	
	async.eachSeries(qrys, function(qry, callback){
		connection.execute(qry, callback);
	}, cb);

};