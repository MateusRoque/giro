@echo off
cd /d "%~dp0"
echo Publicando a versao atual do Giro na internet...
call npm run deploy
pause
