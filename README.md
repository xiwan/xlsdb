# xlsdb

由于linux环境中没有类似windows的pdm工具来生成数据库，大部分时候需要程序员自己手动维护数据表格。这件事情其实是十分吃力不讨好的。主要原因如下：

1. 容易犯错。首先，很容易手动输入错误。然后项目交接后，新程序员对于老数据库理解问题也会造成输入错误。
2. 效率低下。在多个环境中，需要重复劳动。然后不一定具有平台兼容性。甚至到了生产环境中，某些反复改动还需要程序员自己来操作。

xlsdb主要是为了解决上述问题，并且能够覆盖mysql和oracle两个平台。主要是通过按照一定的格式编辑xls表格，通过xlsdb程序再同步到相应的数据库中。


##如何配置

	; mysql related configuration
	[mysql]
	host = localhost:3306
	user = root
	password = somepassword
	baseDir = /base/path/point/to/mysql/dir/

	; oracle related configuration
	[oracle]
	connectString = 192.168.4.22:1521/orcl
	user = root
	password = somepassword
	baseDir = /base/path/point/to/oracle/dir/


##执行命令

	# mysql 执行命令
	node mysql/init_database.js  --cfg=/Users/wanxi/Documents/dev/xlsdb/cfg/config.ini 
	
	# oracle 执行命令
	node oracle/init_database.js  --cfg=/Users/wanxi/Documents/dev/xlsdb/cfg/config.ini 
	# oracle 插入数据
	node oracle/insert_data.js --cfg=/Users/wanxi/Documents/dev/xlsdb/cfg/config.ini --schema=gameAdmin1
	
