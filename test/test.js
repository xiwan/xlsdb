'use strict'

var xlsdb = require('../index');
var async = require('async');

var cfgPath = '/Users/wanxi/Documents/dev/xlsdb/cfg/config.ini';

async.series([
	function(callback) {
		xlsdb.oracleInitDB(cfgPath, false, callback);
	},
	function(callback) {
		xlsdb.oracleInsert(cfgPath,'laundry', false, callback);
	}
]);

