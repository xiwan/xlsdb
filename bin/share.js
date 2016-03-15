'use strict'
var __ 			= require('lodash');
var util  		= require('util');
var fs 			= require('fs');
var xlsx       	= require('xlsx');
var XL 			= require('./xlsx_utils');

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

function colsAndRows(schema, name, obj, db) {
	var cols = [], insertQry = [];
	var outs = [];
	obj.cols && obj.cols.forEach(function(col){
		cols.push(col.name);
	});
    //insertQry.push(util.format('use %s', schema));
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
                    if(db == 'mysql') rows.push(util.format('STR_TO_DATE(\'%s\', \'%d/%m/%Y %r\')', val));
                    if(db == 'oracle') rows.push(util.format('TO_DATE(\'%s\', \'dd/mm/yyyy HH:MI:SS AM\')', val));
                    //rows.push('\'' + val + '\'');
                }else {
                    dels.push(obj.cols[idx].name);
                }                
            }
		}
        __.remove(tmpCols, function(n) {
            return __.indexOf(dels, n) > -1;
        });

        outs.push({cols: tmpCols, rows: rows});
		//insertQry.push(util.format("INSERT INTO %s.%s ( %s ) VALUES ( %s )", schema, name, tmpCols.join(', '), rows.join(', ')));		
	}
	//return insertQry;

	return outs;
}


function loadExcel2Json(filePath, ignores) {
	try {
		if (!fs.existsSync(filePath)){
			return null;
		}
		
		var iFile = xlsx.readFile(filePath);
		//SheetNames = iFile.SheetNames;
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
                var iName = utils.splitData(csv[2], false);
                var iDefs = utils.splitData(csv[1], true);
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
                    cols : utils.convertToColumns(csv[2], csv[1]),
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


var utils = {
	splitData : splitData,
	convertToColumns : convertToColumns,
	colsAndRows : colsAndRows,
	loadExcel2Json : loadExcel2Json,
}

module.exports.utils = utils;