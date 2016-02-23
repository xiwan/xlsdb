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
var schema = global.argv.schema;
var SheetNames = [];
var tables = {};

async.series([
	function(callback) {
		tables = loadExcel2Json(config.xlsx.fileDir + '/' + schema + '.xlsx', '');
		callback();
	},
	function(callback) {
		loadJson2DB(tables, callback);
	}
], function(err){
	if (err) console.error(err.message);
	process.exit(0);
});

function loadJson2DB(tables, callback) {
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
		SheetNames.forEach(function(sheet){
			insertQry = insertQry.concat(getInsertQry(schema, sheet, tables[sheet]));
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
					console.log('commit!');
				}
				connection.release(callback);
			});
		});
	});
}

function loadExcel2Json(filePath, ignores) {
	try {
		var XL = require('../bin/xlsx_utils');
		var iFile = xlsx.readFile(filePath);
		SheetNames = iFile.SheetNames;
		var tables = {};
		var zLen = iFile.SheetNames.length;
		for(var z=0; z<zLen; z++) {
			var name = iFile.SheetNames[z];
			if (name[0] === '#')
                continue;
            var sheet = iFile.Sheets[name];
            var dataKey = {};

            try {
                var csv = XL.utils.sheet_to_csv(sheet).split('\n');
                var obj = XL.utils.sheet_to_row_object_array(sheet);
                if (!csv[2] || !csv[1])
                    continue;
                var iName = splitData(csv[3], false);
                var iDefs = splitData(csv[2], true);
                if (iName.length > iDefs.length || iName.length === 0) {
                    global.warn('loadExcel2Json. sheet:%s, iName[%d], iDefs[%d]', name, iName.length, iDefs.length);
                    continue;
                }
                var tmp = __.without(iDefs, 'string', 'long', 'int', 'byte', 'float', 'outstring');
                if ( tmp.length > 0 ) {
                    ignores.push({
                        sheet:name,
                        error: JSON.stringify(tmp)
                    });
                    global.warn('loadExcel2Json. sheet:%s, error:%s', name, JSON.stringify(tmp));
                    continue;
                }
                var iSheet = {
                    data : {},
                    cols : convertToColumns(csv[3], csv[2], csv[1]),
                    rows : 0
                };

                var iKey = iName[0].replace(/"/gi, '');
                var iType = iDefs[0].replace(/"/gi, '');
                var i = 0;
                for(var x in obj) {
                    if (i++ < 3) continue;
                    var row = obj[x];

                    var id = row[iKey];
                    if (id == 'EOF') {
                        break;
                    }
                    for(var r in row) {
                        if (r[0] === '#') delete row[r];
                    }

                    for(var k=0; k<iName.length; k++) {
                        var col = iName[k];
                        if (col[0] === '#') {
                            continue;
                        }
                        var def = iDefs[k];
                        var item = row[col];
                        if (typeof(item) === 'undefined') {
                            ignores.push({
                                sheet:name,
                                id : id,
                                col : col,
                                item : 'undefined'
                            });
                        } else if (def ==='int' || def === 'long' || def === 'byte') {
                            var item2 = item.toString();
                            if (parseInt(item) === null || item2.trim().length === 0) {
                                ignores.push({
                                    sheet:name,
                                    id : id,
                                    col : col,
                                    def : def,
                                    item : parseInt(item)
                                });
                                row[col] = parseFloat(item);
                                global.warn('loadExcel2Json. sheet:%s, id:%s, col:%s, value:%s, error:%s', name, id, col, item, typeof(item));
                            } else {
                                row[col] = Math.round(parseFloat(item));
                            }
                        } else if (def == 'float') {
                            var item2 = item.toString();
                            if (parseInt(item) === null || item2.trim().length === 0) {
                                ignores.push({
                                    sheet:name,
                                    id : id,
                                    col : col,
                                    def : def,
                                    item : parseFloat(item)
                                });
                                row[col] = parseFloat(item);
                                global.warn('loadExcel2Json. sheet:%s, id:%s, col:%s, value:%s, error:%s', name, id, col, item, typeof(item));
                            } else {
                                row[col] = parseFloat(item);
                            }
                        } else {
                            row[col] = util.format('%s', row[col]);
                        }
                    }

                    if (iType === 'int' || iType === 'byte'  || iType === 'long') {
                        id = parseInt(id);
                    }

                    var _id = util.format('%s', id).toUpperCase();
                    if (!dataKey[_id]) {
                        dataKey[_id] = true;
                        iSheet.data[id] = row;
                        iSheet.rows++;
                    }
                }
                tables[name] = iSheet;
                //console.dir(tables.Scene);
            } catch (ex) {
            	console.warn('loadExcel2Json. sheet:%s, error:%s', name, ex.toString());
                console.log(ex.stack);
            }
		}
		return tables;
	} catch (ex){
        console.log(ex.stack)
        console.warn('loadExcel2Json:%s', ex.toString());
        return null;
	}
}

function getInsertQry(schema, name, obj) {
	var cols = [], insertQry = [];
	obj.cols && obj.cols.forEach(function(col){
		cols.push(col.name);
	});
	
	for (var i in obj.data) {
		var rows = [];
		var idx = 0;
		for (var j in obj.data[i]) {
			if (!obj.cols[idx]) continue;
			if (obj.cols[idx].def == 'string') {
				rows.push('\'' + obj.data[i][j] + '\'');
			}else if (obj.cols[idx].def == 'int') {
				rows.push(parseInt(obj.data[i][j]));
			}else if (obj.cols[idx].def == 'float') {
				rows.push(parseFloat(obj.data[i][j]));
			}
			idx++;
		}
		insertQry.push(util.format("INSERT INTO %s.%s ( %s ) VALUES ( %s ) ", schema, name, cols.join(', '), rows.join(', ')));		
	}
	return insertQry;
}

function splitData(data, toLower) {
    var list = data.split(',');
    var out = [];
    for(var i=0; i<list.length;i++) {
        var item = list[i].trim().toString();
        if (item.length === 0 || item[0] === '#')
            continue;
        if (toLower)
            item = item.toLowerCase();
        out.push(item);
    }
    return out;
}


function convertToColumns(names, defs, out) {
    names = names.split(',');
    defs = defs.split(',');
    out = out.split(',');
    var cols = [];
    for(var i= 0, iLen=names.length; i<iLen; i++) {
        if (names[i][0] === '#')
            continue;
        cols.push({
            name : names[i],
            def : defs[i],
            out : parseInt(out[i])
        });
    }
    return cols;
}

function convetDataType(dataType, sheet, name, target) {
    switch(dataType.toLowerCase()) {
        case 'byte':
            return 'int';
        case 'int':
            return 'int';
        case 'long':
            return target === 1 ? 'Outlong' : 'long';
        case 'float':
            return 'double';
        case 'string':
            return 'string';
        case 'outstring':
        case 'out_string':
            return target === 1 ? 'OutString' : 'string';
        default:
            global.warn('convetDataType unsupported data sheet:%s, name:%s, type:%s', sheet, name, dataType);
            return 'string';
    }
}

function convertDataBody(dataType, name, target) {
    if (dataType === 'OutString' || dataType === 'string')
        return util.format('\t\t\tpublic %s %s;', dataType, name);

    var iList = [];
    if (target === 1) {
        iList.push('\t\t\t[SerializeField]');
        iList.push(util.format('\t\t\tprotected %s _%s;', dataType, name));
        iList.push(util.format('\t\t\tpublic %s %s { get { return _%s + NetData.TableRandomValue; } set {_%s = value - NetData.TableRandomValue;}}', dataType, name, name, name));
    } else {
        iList.push(util.format('\t\t\tpublic %s %s;', dataType, name));
    }
    return iList.join('\n');
}


function convetSQLiteDataType(dataType, sheet, name) {
    switch(dataType.toLowerCase()) {
        case 'byte':
        case 'int':
        case 'long':
            return 'INTEGER';
        case 'float':
            return 'REAL';
        case 'outstring':
        case 'string':
        case 'out_string':
            return 'TEXT';
        default:
            global.warn('convetSQLiteDataType unsupported data sheet:%s, name:%s, type:%s', sheet, name, dataType);
            return 'TEXT';
    }
}





