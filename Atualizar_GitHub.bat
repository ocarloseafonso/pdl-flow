@echo off
echo =========================================
echo    Sincronizando com o GitHub...
echo =========================================
echo.

git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: O Git nao esta instalado neste computador.
    pause
    exit /b
)

if not exist ".git" (
    echo ERRO: Esta pasta ainda nao esta conectada a um repositorio do GitHub.
    pause
    exit /b
)

set /p msg="Digite o que voce atualizou (ou de ENTER para usar 'Atualizacao automatica'): "
if "%msg%"=="" set msg=Atualizacao automatica

echo.
echo Adicionando arquivos...
git add .
echo.
echo Salvando versao...
git commit -m "%msg%"
echo.
echo Enviando para o GitHub...
git push

if %errorlevel% neq 0 (
    echo.
    echo Ocorreu um erro ao enviar para o GitHub. Verifique se ha conflitos.
) else (
    echo.
    echo Sucesso! Tudo atualizado no GitHub.
)
echo.
pause
