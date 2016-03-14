'use strict'

var fs 			= require('fs');
var util       	= require('util');
var oracledb    = require('oracledb');
var xlsx       	= require('xlsx');
var async      	= require('async');
var ini 		= require('ini');
var __ 			= require('lodash');

var config =  {};
var SheetNames = [];

exports.loadData = function(cfg, schemas, append, cb){
    append = append || true;
    config = ini.parse(fs.readFileSync(cfg, 'utf-8'));
    if (!config.oracle) {
        console.warn('no configuration!');
        cb(new Error('no configuration!'));  
    }

    if (!schemas) {
        console.warn('no schemas!');
        cb(new Error('no schemas!'));   
    }

    async.eachSeries(schemas.split(','), function(schema, callback){
        var tables = loadExcel2Json(config.xlsx.fileDir + '/' + schema + '.xlsx', []);
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
		SheetNames.forEach(function(sheet){
			if (!append){
				insertQry.push(util.format("TRUNCATE TABLE %s.%s", schema, sheet));
			}
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
					console.log(schema + ': commit!');
				}
                console.log('load schema %s', schema);
				connection.release(callback);
			});
		});

	});
}

function loadExcel2Json(filePath, ignores) {
	try {
		if (!fs.existsSync(filePath)){
			return null;
		}
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
                if (!csv[1])
                    continue;
                var iName = splitData(csv[2], false);
                var iDefs = splitData(csv[1], true);
                if (iName.length > iDefs.length || iName.length === 0) {
                    console.warn('loadExcel2Json. sheet:%s, iName[%d], iDefs[%d]', name, iName.length, iDefs.length);
                    continue;
                }
                var tmp = __.without(iDefs, 'string', 'long', 'int', 'byte', 'float', 'outstring', 'date');
                if ( tmp.length > 0 ) {
                    ignores.push({
                        sheet:name,
                        error: JSON.stringify(tmp)
                    });
                    console.warn('loadExcel2Json. sheet:%s, error:%s', name, JSON.stringify(tmp));
                    continue;
                }
                var iSheet = {
                    data : {},
                    cols : convertToColumns(csv[2], csv[1]),
                    rows : 0
                };
                var iKey = iName[0].replace(/"/gi, '');
                var iType = iDefs[0].replace(/"/gi, '');
                var i = 0;
                for(var x in obj) {
                    if (i++ < 2) continue;
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
                                console.warn('loadExcel2Json. sheet:%s, id:%s, col:%s, value:%s, error:%s', name, id, col, item, typeof(item));
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
                                console.warn('loadExcel2Json. sheet:%s, id:%s, col:%s, value:%s, error:%s', name, id, col, item, typeof(item));
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
	
    insertQry.push('INSERT ALL ');
	for (var i in obj.data) {
		var rows = [];
        var dels = []; 
        var tmpCols = JSON.parse(JSON.stringify(cols));
		for (var idx in obj.cols) {
			if (!obj.cols[idx]) continue;
            var val = obj.data[i][obj.cols[idx].name];

			if (obj.cols[idx].def == 'string') {
                if (val!== undefined) {
                    rows.push('\'' + val + '\'');
                }else {
                    dels.push(obj.cols[idx].name);
                }
			}else if (obj.cols[idx].def == 'int' || obj.cols[idx].def == 'long' || obj.cols[idx].def == 'byte') {
                if (val !== undefined && !__.isNaN(parseInt(val))) {
                    rows.push(parseInt(val));
                }else {
                    dels.push(obj.cols[idx].name);
                }
			}else if (obj.cols[idx].def == 'float') {
                if (val!== undefined && !__.isNaN(parseFloat(val))) {
                    rows.push(parseFloat(val));
                }else {
                    dels.push(obj.cols[idx].name);
                }
			}else if (obj.cols[idx].def == 'date') {
                if (val !== undefined) {
                    rows.push(util.format('TO_DATE(\'%s\', \'dd/mm/yyyy HH:MI:SS AM\')', val));
                    //rows.push(util.format('DATE \'%s\'', obj.data[i][j]));
                }else {
                    dels.push(obj.cols[idx].name);
                }                
            }
		}
        __.remove(tmpCols, function(n) {
            return __.indexOf(dels, n) > -1;
        });
		insertQry.push(util.format("INTO %s.%s ( %s ) VALUES ( %s )", schema, name, tmpCols.join(', '), rows.join(', ')));		
	}
    insertQry.push('SELECT * FROM DUAL');
	return [insertQry.join(' ')];
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


function convertToColumns(names, defs) {
    names = names.split(',');
    defs = defs.split(',');
    //out = out.split(',');
    var cols = [];
    for(var i= 0, iLen=names.length; i<iLen; i++) {
        if (names[i][0] === '#')
            continue;
        cols.push({
            name : names[i],
            def : defs[i],
            //out : parseInt(out[i])
        });
    }
    return cols;
}







