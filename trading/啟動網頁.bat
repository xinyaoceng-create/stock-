@echo off
chcp 65001 >nul
echo 正在啟動本地伺服器以載入歷史資料...
echo 請不要關閉這個黑色視窗！

:: 開啟瀏覽器
start http://localhost:8123

:: 啟動伺服器
python -m http.server 8123