#!bin/bash

basePath=`pwd`
mysqlPath="$basePath\mysql"
oraclePath="$basePath\oracle"

help_info(){
	echo "NAME"
	echo "\t$0" 
	echo "SYNOPSIS"
	echo "\t$0 convinent way for db editing by xls sheet"
	echo "DESCRIPTION"

}


if [ $# -eq 0 ]
then
	help_info
	exit 0
fi