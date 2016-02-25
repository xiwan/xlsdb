'use strict'

var fs 			= require('fs');
var util       	= require('util');
var oracledb    = require('oracledb');
var xlsx       	= require('xlsx');
var async      	= require('async');
var ini 		= require('ini');
var __ 			= require('lodash');

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

        getTableList(connection, schema.Name, function(err, iList){
        	if (err){
        		connection.release(cb);
				return;
        	}
            var domain = {};
            var iData = [], workList = [];
            var iDomains = tables.Domain;

            iDomains.forEach(function(iRef) {
                iData.push({
                    schema : schema.Name,
                    domain : domain,
                    iRef : iRef,
                    iList : iList,
                    tables : tables,
                    workList : workList
                })
            });
            async.mapSeries(iData, function(data, cb) { 
            	initTable(connection, data, cb) 
            }, function(err){
            	console.warn('initSchema. name:%s', schema.Name);
            	connection.release(cb);
            });

        });

		// async.series([
		// 	function(callback) {
		// 		var qry = util.format('CREATE SCHEMA AUTHORIZATION %s ', schema.Name);
		// 		qry += getTableQry(schema.Name, 'DataVersion', schemas.DataVersion);
		// 		comments = comments.concat(getCommentQry(schema.Name, 'DataVersion', schemas.DataVersion));
		// 		connection.execute(qry, callback);
		// 	},
		// 	function(callback) {
		//         async.eachSeries(tables['Domain'], function(table, cbk){
		//         	var qry = getTableQry(schema.Name, table.TableName, tables[table.TableName]);
		//         	comments = comments.concat(getCommentQry(schema.Name, table.TableName, tables[table.TableName]));
		//         	connection.execute(qry, cbk);
		//         }, callback);
		// 	},
		// 	function(callback) {
		// 		async.eachSeries(comments, function(qry, cbk){
		// 			connection.execute(qry, cbk);
		// 		}, callback);
		// 	}

		// ], function(err, result){
		// 	if (err){
		// 		console.error(err.message);
		// 	}
		// 	connection.release(cb);
		// });

	});
}

function initTable(connection, data, cb) {
	try {
		var name = data.iRef.TableName;
		if (__.indexOf(data.workList, name) >= 0) {
            cb(null);
            return;
        }
        data.workList.push(name);
        if (!data.iList[name]) {
        	async.series([
        		function(callback){
        			var qry = util.format('CREATE SCHEMA AUTHORIZATION %s ', data.schema);
        			qry += getTableQry(data.schema, data.iRef, data.tables[name]);
        			connection.execute(qry, callback);
        		},
        		function(callback){
        			var comments = getCommentQry(data.schema, data.iRef, data.tables[name]);
        			async.eachSeries(comments, function(qry, cbk){
        				connection.execute(qry, callback);
        			}, callback);
        		}
        	], function(err){
                if (err) {
                    console.error(err.message);
                    cb(err);
                    return;
                }
        		console.log('create table %s.%s', data.schema, name);
        		cb(null);
        	});
        }else {
        	cb(null);
        }
	} catch (ex) {
        console.warn('initTable. %s.%s error:%s', data.schema, data.iRef.TableName, ex.code);
        console.log(ex.stack);
        cb(null, ex);
    }

}

function getTableList(connection, name, cb) {
    var qry = [];
    qry.push('SELECT TABLE_NAME FROM TABS');
    qry.push('WHERE TABLE_NAME <> \'DataVersion\'');
    connection.execute(qry.join(' '), function(err, result){
    	if (err) { 
    		cb(err); 
    		return; 
    	}

    	var iList = [];
    	var rows = result.rows;

        rows.forEach(function(row){
            iList.push({
                schema : name,
                name : row[0].toUpperCase()
            });
        });

        var iAck = {};
        async.mapSeries(iList, function(data, cbk){
        	getColumnList(connection, data, cbk);
        }, function(err, results){
            results.forEach(function(result, idx) {
                iAck[iList[idx].name] = result.cols;
            });
            cb(null, iAck);
        });
    });
}

function getColumnList(connection, data, cb) {
	var qry = util.format('SELECT COLUMN_NAME, DATA_TYPE, NULLABLE FROM USER_TAB_COLUMNS WHERE TABLE_NAME = \'%s\'', data.name);
	connection.execute(qry, function(err, result){
        var iAck = {
            error : err,
            cols : []
        };
        if (!err) {
        	var rows = result.rows;
        	rows.forEach(function(row){
        		iAck.cols[row[0]] = {
                    DataType : row[1],
                    IsNull : row[2] === 'N' ? 'NOT' : undefined,
                    //IsKey : row.Key
        		}
        	});
        }
        cb(null, iAck);
	});

}

function getTableQry(schema, desc, obj) {
	var cols = [], key = [];
	obj.forEach(function(col) {
		if (col.Name) {
			cols.push(util.format('%s %s %s NULL', col.Name, col.DataType, col.IsNull?'NOT':''));
			col.IsKey && key.push(util.format('%s', col.Name));
		}
	});

	var createSql = util.format('CREATE TABLE %s.%s (\n  %s,\n PRIMARY KEY (%s)) ', schema, desc.TableName, cols.join(',\n  '), key.join(',')); 
    return createSql;

}

function _getTableQry(schema, name, obj) {
	var cols = [], key = [];
    obj.forEach(function(col) {
        cols.push(util.format('%s %s %s NULL', col.Name, col.DataType, col.IsNull?'NOT':''));
        col.IsKey && key.push(util.format('%s', col.Name));
    });
    var createSql = util.format('CREATE TABLE %s.%s (\n  %s,\n PRIMARY KEY (%s)) ', schema, name, cols.join(',\n  '), key.join(',')); 
    return createSql;
}

function getCommentQry(schema, desc, obj) {
	var cols = [], key = [];
    obj.forEach(function(col) {
    	cols.push(util.format('COMMENT ON COLUMN %s.%s is \'%s\'', desc.TableName, col.Name, col.Description));
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