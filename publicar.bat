@echo off
cd /d "%~dp0"
echo Publicando alteracoes no GitHub...
git add .
git commit -m "Atualizacao %date% %time%"
git push
echo.
echo Pronto! Vercel vai fazer o deploy em ~1 minuto.
pause
