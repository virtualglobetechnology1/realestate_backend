@echo off
echo Starting XAMPP MySQL daemon for SocietySync...
start /B "" "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
timeout /t 2 >nul
echo MySQL daemon started on port 3306.
