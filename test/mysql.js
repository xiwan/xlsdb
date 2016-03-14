'use strict'

var xlsdb = require('../index');
var async = require('async');

var cfgPath = '/Users/wanxi/Documents/dev/xlsdb/cfg/config.ini';

async.series([
	function(callback) {
		xlsdb.mysqlInitDB(cfgPath, true, callback);
	},
	function(callback) {
		xlsdb.mysqlLoadDB(cfgPath,'gameAdmin1', false, callback);
	}
]);

