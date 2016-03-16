'use strict'

var util        = require('util');
var xlsx        = require('xlsx');
var async       = require('async');
var __          = require('lodash');
var mysql       = require('mysql');
var share       = require('../bin/share');

exports.loadData = function(cb){
    var self = this;
    async.eachSeries(self.config.schemas.split(','), function(schema, callback){
        var tables = share.utils.loadExcel2Json(self.config.xlsx.dataDir + '/' + schema + '.xlsx', []);
        loadJson2DB(self.config, tables, schema, callback);
    }, function(err){
        if (err) console.error(err.message);
        console.log('done!');
        cb(err);
    });
};


function loadJson2DB(config, tables, schema, callback) {
	if (!tables) {
		callback(new Error(schema + ': no such file or directory'));
		return;
	}

    var connection = mysql.createConnection({
        host     : config.mysql.host || schema.Host,
        user     : config.mysql.user,
        password : config.mysql.password,
        port     : config.mysql.port || 3306
    });
    connection.connect();

    var insertQry = [];
    var SheetNames = __.keys(tables);
	SheetNames.forEach(function(sheet){
		if (!config.append){
			insertQry.push(util.format("TRUNCATE TABLE %s.%s", schema, sheet));
		}
        insertQry.push(util.format('use %s', schema));
        var outs = share.utils.colsAndRows(schema, sheet, tables[sheet], config.db);
        for (var i in outs) {
            insertQry.push(util.format("INSERT INTO %s.%s ( %s ) VALUES ( %s )", schema, sheet, outs[i].cols.join(', '), outs[i].rows.join(', ')));       
        }
	});
 
	async.eachSeries(insertQry, function(qry, cbk){
		connection.query(qry, cbk)
	}, function(err){
		if (err){
			console.error(err.message);
			connection.end();
			return;
		}
        console.log('load schema %s', schema);
		connection.end();
		callback()
	});
}

