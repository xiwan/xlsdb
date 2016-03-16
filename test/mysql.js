'use strict'

var xlsdb = require('../index');
var async = require('async');

var config = {
	path : '/Users/wanxi/Documents/dev/xlsdb/cfg/config.ini',
	db : 'mysql',
	sysConn : 'systems.xlsx',
	schemas : 'gameAdmin1',
	build : true,
	append : false
}

var _xlsdb = xlsdb.create(config);

async.series([
	function(callback) {
		_xlsdb.init(callback);
	},
	function(callback) {
		_xlsdb.load(callback);
	}
]);

