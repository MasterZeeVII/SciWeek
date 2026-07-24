import pymysql

# The project uses PyMySQL (pure Python) instead of mysqlclient, so let it
# stand in for the MySQLdb module Django's mysql backend imports.
pymysql.install_as_MySQLdb()
