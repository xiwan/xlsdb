# xlsdb

## Before

1. This is a nodejs project, make sure you are comfortable with it.
2. Since **xlsdb** can communicate with both mysql and oracle. The dependency is required beafore everything, especailly for [oracle](https://github.com/oracle/node-oracledb/blob/master/INSTALL.md). 
3. This project now still in phase of active coding upload. Please be aware of this point.

## Brief

Since the Linux OS doesn't have similar tool to pdm in Windows, most of time, the programmers have to matain the db through different scripts. Acutually, this job is quite elbow-grease. There are some points need to know:

1. Err-prone because of the typo. Also, the laters may not have good understanding on orignal db.
2. Low-efficiency. Multi env means multi efforts, even the compatibility issue still not completely solved.

**xlsdb** mainly focus on this problem, and fit in both mysql and oracle. It changes the scripting to the editing on xls and synchronize the modification to targets.

由于linux环境中没有类似windows的pdm工具来生成数据库，大部分时候需要程序员自己手动维护数据表格。这件事情其实是十分吃力不讨好的。主要原因如下：

1. 容易犯错。首先，很容易手动输入错误。然后项目交接后，新程序员对于老数据库理解问题也会造成输入错误。
2. 效率低下。在多个环境中，需要重复劳动。然后不一定具有平台兼容性。甚至到了生产环境中，某些反复改动还需要程序员自己来操作。

**xlsdb**主要是为了解决上述问题，并且能够覆盖mysql和oracle两个平台。主要是通过按照一定的格式编辑xls表格，通过xlsdb程序再同步到相应的数据库中。


## Install

	npm install xlsdb

Or

	https://github.com/xiwan/xlsdb.git

	
## How to use

The very first thing usually is build a configuration file, for example:

	// config.ini
	; mysql related configuration
	[mysql]
	host = localhost:3306
	user = root
	password = somepassword
	baseDir = /base/path/point/to/mysql/dir/

	; oracle related configuration
	[oracle]
	connectString = localhost:1521/orcl
	user = root
	password = somepassword
	baseDir = /base/path/point/to/oracle/dir/

	; xls files path
	[xlsx]
	fileDir = /path/to/xls/data/directory/

To import the package:

	var xlsdb = require('xlsdb');


Specify the path to our config.ini:

	var cfgPath = '/path/to/config.ini';

	
there are serveral public methods available for quick usage:

	// param1 : the path to conf
	// param2 : rebuild db flag, default is false;
	xlsdb.mysqlInitDB(param1, param2, callback);

	// param1 : the path to conf
	// param2 : string of target dbs, like: 'db1,db2,db3'
	// param3 : append flag, default is false;
	xlsdb.mysqlLoadDB(param1, param2, param3, cb);
	
	// param1 : the path to conf
	// param2 : rebuild db flag, default is false;
	xlsdb.oracleInitDB(param1, param2, callback);

	// param1 : the path to conf
	// param2 : string of target dbs, like: 'db1,db2,db3'
	// param3 : append flag, default is false;
	xlsdb.oracleLoadDB(param1, param2, param3, cb);

## Command-Line (Obsolete)

	# mysql init
	node mysql/init_database.js  --cfg=/Users/wanxi/Documents/dev/xlsdb/cfg/config.ini 


Default init behavior is rebuild db. If there is a **build** argument, the modification will occur on present db. 

每次默认是重新建立数据库的。如果有build参数，则不会重新生成数据库。

	# oracle init
	node oracle/init_database.js  --cfg=/Users/wanxi/Documents/dev/xlsdb/cfg/config.ini --build=false

	# oracle insert
	node oracle/insert_data.js --cfg=/Users/wanxi/Documents/dev/xlsdb/cfg/config.ini --schema=gameAdmin1
	
