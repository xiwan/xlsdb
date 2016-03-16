'use strict'

var fs 			= require('fs');
var util       	= require('util');
var xlsx       	= require('xlsx');
var async      	= require('async');
var ini 		= require('ini');
var __ 			= require('lodash');
var oracledb    = require('oracledb');
var share       = require('../bin/share');

var config =  {};

exports.loadData = function(cfg, schemas, append, cb){
    append = append && true;
    config = ini.parse(fs.readFileSync(cfg, 'utf-8'));
    config.db = 'oracle';
    
    if (!config.oracle) {
        console.warn('no configuration!');
        cb(new Error('no configuration!'));  
    }

    if (!schemas) {
        console.warn('no schemas!');
        cb(new Error('no schemas!'));   
    }

    async.eachSeries(schemas.split(','), function(schema, callback){
        var filePath = config.xlsx.fileDir + '/' + schema + '.xlsx';
        var tables = share.utils.loadExcel2Json(config.xlsx.fileDir + '/' + schema + '.xlsx', []);
        loadJson2DB(tables, schema, append, callback);
    }, function(err){
        if (err) console.error(err.message);
        console.log('done!');
        cb(err);
    });

}


function loadJson2DB(tables, schema, append, callback) {
	if (!tables) {
		callback(new Error(schema + ': no such file or directory'));
		return;
	}
	oracledb.getConnection({
		user : config.oracle.user,
		password : config.oracle.password,
		connectString : config.oracle.connectString
	}, function (err, connection){
		if (err) { 
			console.warn(err.message); 
			cb(err);
			return; 
		}

		var insertQry = [];
        var SheetNames = __.keys(tables);
		SheetNames.forEach(function(sheet){
			if (!append){
				insertQry.push(util.format("TRUNCATE TABLE %s.%s", schema, sheet));
			}
            var tempInsertQry = [];
            tempInsertQry.push('INSERT ALL');
            var outs = share.utils.colsAndRows(schema, sheet, tables[sheet], config.db);
            for (var i in outs) {
                tempInsertQry.push(util.format("INTO %s.%s ( %s ) VALUES ( %s )", schema, sheet, outs[i].cols.join(', '), outs[i].rows.join(', ')));       
            }
            tempInsertQry.push('SELECT * FROM DUAL');

            insertQry = insertQry.concat([tempInsertQry.join(' ')])
		});
   
		async.eachSeries(insertQry, function(qry, cbk){
			connection.execute(qry, {}, { autoCommit: false }, cbk);
		}, function(err){
			if (err){
				console.error(err.message);
				connection.release(callback);
				return;
			}
			
			connection.commit(function(err){
				if (err){
					console.error(err.message);
				}else {
					console.log(schema + ': commit!');
				}
                console.log('load schema %s', schema);
				connection.release(callback);
			});
		});

	});
}









