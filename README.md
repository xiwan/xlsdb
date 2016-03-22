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

## How to xls

For reference purpose, please download the whole package and check the xls/schema folder.

### build database

First of all, let's create a xlsx file named systems for db connection specification.

* Name : DB name. For oracle, the User field have to be the same name as this field. Mysql doesn't have to obey this rule. 
* Host : DB host location.
* User : DB access user name.
* Password : Passwod for the name.
* LogDB : N/A
* Description: DB comment.

首先我们需要创建对于不同db的数据库连接文件，一般命名为systems.xlsx

* Name : 数据库的名称，由于oracle的特殊性，一般这个字段和后面User字段一样。不过mysql不必遵守这个要求。
* Host : 数据库服务器地址
* User : 对应数据库访问的用户名
* Password : 对应用户名的密码
* LogDB : 无用
* Description : 数据库描述

![systems](https://cloud.githubusercontent.com/assets/931632/13909143/c25568b4-ef49-11e5-9b8a-dfaad114dcff.png)

### build tables

Next, we could create a xls file named gameAdmin1.xlsx to specifiy how this db orangnize. Normally, its structure is fixed: first tab must be 'Domain', which gives the list of whole db. The other tabs afterwards are designed for every table in this db respectively.

接下来可以分别创建systems表格里面说明的数据库，比如gameAdmin1.xlsx。它的结构基本是固定的：第一个签页为Domain，描述了整个数据库。后面就是一张张表格的具体描述。

![Domain](https://cloud.githubusercontent.com/assets/931632/13909636/9cc91ade-ef51-11e5-8b82-bdbb57be8f9c.png)

Domain tab describes the whole db:

* Domain : use to group the table. one-many.
* Name : table name
* TableName : table name
* Hierachy : N/A
* Partition* : N/A
* Description : table comment.

Domain签页主要是对于整个数据库的描述。需要关注的几个是前面几个字段

* Domain : 用来表征Table的集合，一对多的关系。
* Name : 名字
* TableName : 表格名字
* Hierachy : 无用，可以空。
* Partition* : 可以为空
* Description : 表格描述

Let's check one tab after the 'Domain'.

![Tab](https://cloud.githubusercontent.com/assets/931632/13909687/84b9dee6-ef52-11e5-9e84-ca080612d88f.png)

* Name: field name
* DataType: data type, mysql and oracle don't have same value for this field.
* isNull: is Null?
* isKey: is Key?
* Default: default value
* Description : field comment


* Name: 字段名称
* DataType: 数据类型，oracle与mysql不同的地方就是数据库支持的DataType不同
* isNull: 是否为空
* isKey: 是否为主键，可以多个key.
* Default: 默认值
* Description : 字段描述

### xls data

How to load data by xls sheet? we need to create another file named gameAdmin1.xlsx, but not living in the same folder of previous gameAdmin1.xlsx. Its structure goes like:

如何通过xls来加载数据呢？我们需要建立一个gameAdmin1.xlsx的文件（与上面的文件放在不同目录），里面的结构如下：

![xls data](https://cloud.githubusercontent.com/assets/931632/13909765/e9949440-ef53-11e5-8ed6-21edd9c5f1b5.png)

* the first row is comment for each column
* the second row is data type，which supports string, int ,long, byte, float和date
* the third row is field name.
* from the forth row, the actual data are filled here.
* the whole sheet ends with EOF at last row。

* 第一行是对于每列的描述
* 第二行是数据类型，支持string, int ,long, byte, float和date
* 第三行是列名字，相当于表中的字段名字，需要一一对应。
* 从第四行开始就是具体的数据了。
* 最后一行用EOF表示数据的结尾。

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
