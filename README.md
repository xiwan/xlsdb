# xlsdb

## Before

1. This is a nodejs project, make sure you are comfortable with it.
2. Since **xlsdb** can communicate with both mysql and oracle. The dependency is required beafore everything, especailly for [oracle](https://github.com/oracle/node-oracledb/blob/master/INSTALL.md). 
3. This project now is stable.

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

Or just download it from:

	https://github.com/xiwan/xlsdb.git

	
## How to use it

The very first thing usually is build a configuration file. Usually, this file is for globally config. for example:

首先你需要建立一个配置文件config.ini，通常这个是全局的一个配置。如下：

	// config.ini
	; mysql related configuration
	[mysql]
	host = localhost:3306
	user = root
	password = somepassword

	; oracle related configuration
	[oracle]
	connectString = localhost:1521/orcl
	user = root
	password = somepassword

	; xls files path
	[xlsx]
	dataDir = /path/to/xls/data/directory/
	mysqlDir = /base/path/point/to/mysql/dir/
	oracleDir = /base/path/point/to/oracle/dir/


next, create a config object. note: this config object will be extended with config.ini, so don't make any conflict name.

接着，在代码中创建一个config对象。注意：这个对象的key的名字不要和config.ini文件中的冲突。
	
	var config = {
		path : '/path/to/config.ini',
		db : 'mysql', 				// default is 'mysql', another value is 'oracle',
		schemas : 'gameAdmin1', 	// if multi schemas, like 'db1,db2'
		build : true, 				// build flag, boolean, default is 'true'
		append : false 				// append flag, boolean, default is 'false'
	}
	
Let's check the final config object, if you just console it out:

	{ 
		path: '/path/to/config.ini',
  		db: 'oracle',
  		sysConn: 'systems.xlsx',
  		schemas: 'gameAdmin1',
  		build: true,
  		append: false,
  		mysql: 
   		{ 
   			host: 'localhost',
     		port: '3306',
     		user: 'root',
     		password: 'somepassword'
     	},
  		oracle: 
   		{ 
   			connectString: 'localhost:1521/orcl',
     		user: 'root',
     		password: 'somepassword'
     	},
  		xlsx: { 
  			dataDir: '/path/to/xls/data/directory/',
  			mysqlDir: '/base/path/point/to/mysql/dir/',
  			oracleDir: '/base/path/point/to/oracle/dir/' 
  		} 
  	}

create new xlsdb instance passing config object as parameter:

创建一个xlsdb实例，传入config对象

	var xlsdb = require('xlsdb');
	var _xlsdb = xlsdb.create(config);
		
there are two public methods available for quick usage:

	getConfig() // get the current config object

	init(cb) // init database 
	
	load(cb) // load data to db


For more detail, please check the test folder :)


## Dependency

    "async": "1.x",
    "lodash": "~3.10.1",
    "mysql": "~2.7.0",
    "optimist": "~0.6.0",
    "xlsx": "~0.3.3",
    "oracledb": "~1.6.0",
    "ini": "~1.1.0"
