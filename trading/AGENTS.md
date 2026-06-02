# AI 代理開發指南 (AGENTS.md)

這是一份為 AI 輔助開發工具（如 Cursor, Github Copilot, Antigravity 等）準備的專案指南，用以幫助 AI 快速了解本專案的架構、技術堆疊與開發守則。

## 專案概述
本專案是一個**交易策略模擬器 (Trading Strategy Simulator)**，主要透過純前端網頁與 TradingView Lightweight Charts 呈現歷史 K 線行情，並在本地端模擬各種投資策略（如定期定額、均線交叉、阿甘投資法等）的績效。

## 技術堆疊
- **前端核心**：HTML5, CSS3, Vanilla JavaScript (純 JS，無前端框架)。
- **圖表庫**：TradingView Lightweight Charts (圖表呈現)。
- **後端/數據處理**：Python 3 (使用 `yfinance` 抓取資料，`mplfinance` 繪製靜態圖)。

## 專案結構
- `index.html`: 主畫面與 UI 控制項。
- `style.css`: 視覺樣式設定。
- `main.js`: 核心邏輯，包含圖表初始化、歷史資料載入、以及多種交易策略的模擬引擎。
- `data/`: 存放由 Python 抓取的各項資產歷史資料（`.json` 及 `.js` 格式）。
- `fetch_data.py`: 更新歷史資料的 Python 腳本。
- `plot_candle.py`: 產生靜態 K 線圖（如 `0050_candle_chart.png`）的 Python 腳本。

## 歷史資料處理特別規則
- **0050 (0050.TW)**：因 Yahoo Finance 在 2014 年前後有錯誤的分割紀錄，故已改為透過 `FinMind` 直接向台灣證交所 (TWSE) 抓取正確的原始歷史資料，不再使用人工除以 4 的方式修正。
- 其他資產：仍維持使用 `yfinance` 抓取 Yahoo Finance 的資料。

## 交易策略 (定義於 `main.js`)
目前實作的策略包含：
1. **allin**: 第一天全壓。
2. **dca**: 定期定額。
3. **gump**: 阿甘投資法 (根據高點回檔幅度，大跌抄底、逢低加碼)。
4. **buy_dip**: 波段低點買入 (判斷回檔與反彈比例)。
5. **dca_relative_high**: 創新高後，根據回檔幅度分層加碼。
6. **ma_cross**: 均線交叉 (SMA20 與 SMA60 黃金交叉買入，死亡交叉賣出)。

## 開發與修改守則
1. **語言與溝通**
   - 所有的程式碼註解、文件更新，請使用**繁體中文 (Traditional Chinese)**。
   - 與使用者對話或解釋邏輯時，強制使用**繁體中文**。
2. **前端開發規範**
   - 維持純 Vanilla JS 架構，不要隨意引入 React/Vue 等框架，保持輕量。
   - 修改圖表邏輯時，需注意 Lightweight Charts 的版本相容性（請盡量使用或參考 `main.js` 中已有的 helper 函式，如 `addCandlestickSeriesHelper`）。
   - 確保網頁可以在本地端透過 `file://`（搭配 fallback 機制）或簡單的 HTTP Server 執行。
3. **資料處理規範**
   - 網頁會先嘗試使用 `fetch()` 讀取 `data/*.json`，若因為 CORS 或 file 協定被擋，必須維持 fallback 機制：動態載入 `data/*.js` 作為全域變數讀取。
   - 若要新增資產或修改資料欄位，請同步修改 `fetch_data.py`，確保資料的下載、轉換與儲存符合前端預期。
4. **UI/UX 設計**
   - 維持現有的深色模式 (Dark Mode) 設計與質感。
   - 遵循現有圖表標記的顏色規範（例如一般買入為綠色、逢低買入為橘色、賣出為紅色、盈虧顏色等）。
