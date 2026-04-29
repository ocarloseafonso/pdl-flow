@echo off
echo =========================================
echo    Iniciando o PDL Flow...
echo =========================================
echo.

if not exist "node_modules" (
    echo [1/2] Instalando pacotes... (isso pode demorar na primeira vez)
    call npm install
)

echo [2/2] Iniciando o servidor...
echo O seu navegador deve abrir sozinho em instantes!
echo.
echo (Nao feche esta janela preta enquanto estiver usando o aplicativo)
echo.

start http://localhost:8080
call npm run dev
