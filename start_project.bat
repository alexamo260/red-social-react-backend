start "MongoDB" /D "C:\Program Files\MongoDB\Server\9.0\bin" mongod.exe --dbpath "C:\data\db"
start "API REST" /D "%~dp0" cmd.exe /k "npm start"