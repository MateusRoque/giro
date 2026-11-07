@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando pela primeira vez...
  call npm install
)
echo Abrindo o Giro em http://localhost:5180 (deixe esta janela aberta enquanto usa)
call npm run dev
