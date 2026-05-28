# Trading Strategy Simulator

這是一個用 TradingView Lightweight Charts 製作的靜態網頁，用本機 JSON 歷史行情資料模擬不同投資策略。

## 開啟網頁

請從專案資料夾啟動本機 HTTP server：

```bash
cd /Users/chenjunhao/Desktop/codex_test/trading
python3 -m http.server 8123
```

然後用瀏覽器開啟：

```text
http://localhost:8123/
```

不要直接雙擊 `index.html`。網頁會用 `fetch()` 讀取 `data/*.json`，直接用 `file://` 開啟時，瀏覽器可能會擋掉本機檔案讀取。

Windows 可以改用 `啟動網頁.bat` 啟動。

## 更新歷史資料

第一次執行前建議建立虛擬環境：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python fetch_data.py
```

Windows PowerShell：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python fetch_data.py
```

## 產生 0050 K 線圖圖片

```bash
python plot_candle.py
```

輸出檔案會是 `0050_candle_chart.png`。

## 檔案說明

- `index.html`：主畫面與控制項
- `style.css`：畫面樣式
- `main.js`：圖表、策略模擬與互動邏輯
- `data/*.json`：各資產歷史 OHLC 資料
- `fetch_data.py`：用 yfinance 更新 JSON 資料
- `plot_candle.py`：用 mplfinance 產生靜態 K 線圖
