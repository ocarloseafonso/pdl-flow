@echo off
chcp 65001 >nul
echo =========================================
echo    Sincronizando com o GitHub...
echo =========================================
echo.

git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: O Git não está instalado neste computador.
    pause
    exit /b
)

if not exist ".git" (
    echo ERRO: Esta pasta ainda nao esta conectada a um repositorio do GitHub.
    echo Para conectar, abra o terminal nesta pasta e rode os comandos do GitHub:
    echo git init
    echo git remote add origin URL_DO_SEU_REPOSITORIO
    echo.
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
    echo Ocorreu um erro ao enviar para o GitHub. Verifique se ha conflitos ou erro de permissao.
) else (
    echo.
    echo Sucesso! Tudo atualizado no GitHub.
)
echo.
pause
