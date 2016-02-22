'use strict'

var oracledb    = require('oracledb');
var util       	= require('util');
var xlsx       	= require('xlsx');
var async      	= require('async');


var iFile = xlsx.readFile('../test/schema/oracle/systems.xlsx');
var schemas = {};
iFile.SheetNames.forEach(function(name) {
    var sheet = iFile.Sheets[name];
    schemas[name] = xlsx.utils.sheet_to_row_object_array(sheet);
});

async.series([
	function(callback) {
		async.eachSeries(schemas.Database, createDatabase, callback);
	},
	function(callback) {
		async.eachSeries(schemas.Database, createSchema, callback);
	}
],
function(err, results){
	err && console.warn(err.message);
	process.exit(0);
});

function createDatabase(schema, cb){
	oracledb.getConnection({
		user : "laundry",
		password : "xiyilang",
		connectString : "192.168.4.22:1521/orcl"
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
		connectString : "192.168.4.22:1521/orcl"
	}, function (err, connection){
		if (err) { 
			console.error(err.message); 
			cb(err);
			return; 
		}
		var qry = util.format('CREATE SCHEMA AUTHORIZATION %s ', schema.User);
		//qry += 'CREATE TABLE products ( product_id number(10) not null, product_name varchar2(50) not null, category varchar2(50), CONSTRAINT products_pk PRIMARY KEY (product_id) ) ';

		qry += getTableQry(schema.Name, 'DataVersion', schemas.DataVersion);
		connection.execute(qry, function(err, result){
			if (err){
				console.error(err.message);
			}
			var comments = getCommentQry(schema.Name, 'DataVersion', schemas.DataVersion);
			async.eachSeries(comments, function(qry, callback){
				connection.execute(qry, callback);
			}, function(err, result){
				if (err){
					console.error(err.message);
				}
				connection.release(cb);
			});
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
    var commentSql = cols.join(';\n');
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