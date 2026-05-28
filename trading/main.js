window.addEventListener('error', function (e) {
    let overlay = document.getElementById('error-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'error-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.background = 'rgba(220, 38, 38, 0.95)';
        overlay.style.color = 'white';
        overlay.style.padding = '15px';
        overlay.style.zIndex = '9999';
        overlay.style.fontWeight = 'bold';
        document.body.appendChild(overlay);
    }
    overlay.innerText += `Error: ${e.message}\n`;
});

// 全域資料快取與非同步控制器
const assetDataCache = new Map();
let activeAbortController = null;

// Lightweight Charts 相容性 Helper
function addCandlestickSeriesHelper(chartInstance, options) {
    if (typeof chartInstance.addCandlestickSeries === 'function') {
        return chartInstance.addCandlestickSeries(options);
    } else if (typeof chartInstance.addSeries === 'function' && LightweightCharts.CandlestickSeries !== undefined) {
        return chartInstance.addSeries(LightweightCharts.CandlestickSeries, options);
    } else {
        throw new Error('當前 Lightweight Charts 版本不支援 addCandlestickSeries 或 addSeries(CandlestickSeries)');
    }
}

function addLineSeriesHelper(chartInstance, options) {
    if (typeof chartInstance.addLineSeries === 'function') {
        return chartInstance.addLineSeries(options);
    } else if (typeof chartInstance.addSeries === 'function' && LightweightCharts.LineSeries !== undefined) {
        return chartInstance.addSeries(LightweightCharts.LineSeries, options);
    } else {
        throw new Error('當前 Lightweight Charts 版本不支援 addLineSeries 或 addSeries(LineSeries)');
    }
}

function addBaselineSeriesHelper(chartInstance, options) {
    if (typeof chartInstance.addBaselineSeries === 'function') {
        return chartInstance.addBaselineSeries(options);
    } else if (typeof chartInstance.addSeries === 'function' && LightweightCharts.BaselineSeries !== undefined) {
        return chartInstance.addSeries(LightweightCharts.BaselineSeries, options);
    } else {
        throw new Error('當前 Lightweight Charts 版本不支援 addBaselineSeries 或 addSeries(BaselineSeries)');
    }
}

function addHistogramSeriesHelper(chartInstance, options) {
    if (typeof chartInstance.addHistogramSeries === 'function') {
        return chartInstance.addHistogramSeries(options);
    } else if (typeof chartInstance.addSeries === 'function' && LightweightCharts.HistogramSeries !== undefined) {
        return chartInstance.addSeries(LightweightCharts.HistogramSeries, options);
    } else {
        throw new Error('當前 Lightweight Charts 版本不支援 addHistogramSeries 或 addSeries(HistogramSeries)');
    }
}

function setSeriesMarkers(seriesInstance, markers) {
    if (seriesInstance) {
        if (typeof seriesInstance.setMarkers === 'function') {
            seriesInstance.setMarkers(markers);
        } else if (typeof seriesInstance.createSeriesMarkers === 'function') {
            seriesInstance.createSeriesMarkers(markers);
        } else {
            console.warn('當前 Lightweight Charts 版本不支援 setMarkers 或 createSeriesMarkers');
        }
    }
}

const domContainer = document.getElementById('tvchart');

const chartOptions = {
    localization: {
        dateFormat: 'yyyy/MM/dd', // 將日期格式設定為 2026/04/26 的寫法
        timeFormatter: (time) => {
            if (typeof time === 'number') {
                const date = new Date(time * 1000);
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                return `${yyyy}/${mm}/${dd}`;
            } else if (time && time.year) {
                const yyyy = time.year;
                const mm = String(time.month).padStart(2, '0');
                const dd = String(time.day).padStart(2, '0');
                return `${yyyy}/${mm}/${dd}`;
            } else if (typeof time === 'string') {
                return time.replace(/-/g, '/');
            }
            return time;
        }
    },
    layout: {
        textColor: '#d1d5db',
        background: { type: 'solid', color: '#1e293b' },
    },
    grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
    },
    crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: {
            visible: true,
            color: 'rgba(226, 232, 240, 0.6)',
            width: 1,
            style: 0,
            labelVisible: true
        },
        horzLine: {
            visible: true,
            color: 'rgba(226, 232, 240, 0.6)',
            width: 1,
            style: 0,
            labelVisible: true
        }
    },
    rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        minimumWidth: 90 // 強制上下圖表右側 Y 軸等寬，使主圖表完全對齊
    },
    timeScale: { borderColor: 'rgba(255, 255, 255, 0.1)', timeVisible: true, secondsVisible: false },
};

const chart = LightweightCharts.createChart(domContainer, chartOptions);

let candleSeries = addCandlestickSeriesHelper(chart, {
    upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350',
});

let sma20Series = addLineSeriesHelper(chart, {
    color: '#4caf50',
    lineWidth: 2,
    crosshairMarkerVisible: false,
});

let sma60Series = addLineSeriesHelper(chart, {
    color: '#2196f3',
    lineWidth: 2,
    crosshairMarkerVisible: false,
});

const volumeContainer = document.getElementById('volume-chart');
const volumeChartOptions = {
    ...chartOptions,
    crosshair: {
        ...chartOptions.crosshair,
        mode: LightweightCharts.CrosshairMode.Magnet,
    }
};
const volumeChart = LightweightCharts.createChart(volumeContainer, volumeChartOptions);

let volumeSeries = addHistogramSeriesHelper(volumeChart, {
    color: '#26a69a',
    priceFormat: { type: 'volume' },
});

const pnlContainer = document.getElementById('pnl-chart');
const pnlChart = LightweightCharts.createChart(pnlContainer, chartOptions);

let pnlSeries = addBaselineSeriesHelper(pnlChart, {
    baseValue: { type: 'price', price: 2000000 },
    topLineColor: 'rgba(38, 166, 154, 1)',
    topFillColor1: 'rgba(38, 166, 154, 0.28)',
    topFillColor2: 'rgba(38, 166, 154, 0.05)',
    bottomLineColor: 'rgba(239, 83, 80, 1)',
    bottomFillColor1: 'rgba(239, 83, 80, 0.05)',
    bottomFillColor2: 'rgba(239, 83, 80, 0.28)',
});

// Sync time scales without echo loop safely (async event compatible)
let syncIsActive = false;
function syncTimeScales(sourceChart, range) {
    if (range && !syncIsActive) {
        syncIsActive = true;
        if (sourceChart !== chart) chart.timeScale().setVisibleLogicalRange(range);
        if (sourceChart !== volumeChart) volumeChart.timeScale().setVisibleLogicalRange(range);
        if (sourceChart !== pnlChart) pnlChart.timeScale().setVisibleLogicalRange(range);
        requestAnimationFrame(() => requestAnimationFrame(() => syncIsActive = false));
    }
}

chart.timeScale().subscribeVisibleLogicalRangeChange(range => syncTimeScales(chart, range));
volumeChart.timeScale().subscribeVisibleLogicalRangeChange(range => syncTimeScales(volumeChart, range));
pnlChart.timeScale().subscribeVisibleLogicalRangeChange(range => syncTimeScales(pnlChart, range));

async function loadAssetData(assetKey) {
    // 1. 檢查記憶體快取
    if (assetDataCache.has(assetKey)) {
        return assetDataCache.get(assetKey);
    }

    // 2. Fallback: 如果是本地 file:// 協定，優先讀取已經載入的全域變數或動態加載
    if (window.location.protocol === 'file:') {
        if (window[`data_${assetKey}`]) {
            assetDataCache.set(assetKey, window[`data_${assetKey}`]);
            return window[`data_${assetKey}`];
        }
        try {
            const data = await loadDataViaScript(assetKey);
            assetDataCache.set(assetKey, data);
            return data;
        } catch (e) {
            throw new Error(`本地 file:// 協定載入失敗，請確認 data/${assetKey}.js 存在。`);
        }
    }

    // 3. 正常 fetch (帶有 AbortSignal)
    const response = await fetch(`data/${assetKey}.json`, {
        signal: activeAbortController ? activeAbortController.signal : undefined
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    assetDataCache.set(assetKey, data);
    return data;
}

// 動態載入 Script 備用方案
function loadDataViaScript(assetKey) {
    return new Promise((resolve, reject) => {
        if (window[`data_${assetKey}`]) {
            resolve(window[`data_${assetKey}`]);
            return;
        }
        const script = document.createElement('script');
        script.src = `data/${assetKey}.js`;
        script.onload = () => {
            if (window[`data_${assetKey}`]) {
                resolve(window[`data_${assetKey}`]);
            } else {
                reject(new Error(`Script 載入成功但未找到 window.data_${assetKey}`));
            }
            script.remove();
        };
        script.onerror = () => {
            reject(new Error(`無法載入 data/${assetKey}.js`));
            script.remove();
        };
        document.head.appendChild(script);
    });
}

// UI Elements
const simYearsSelect = document.getElementById('sim-years-select');
const assetSelect = document.getElementById('asset-select');
const strategySelect = document.getElementById('strategy-select');
const dcaFreqSelect = document.getElementById('dca-freq-select');
const dcaFreqGroup = document.getElementById('dca-freq-group');
const baseAmountInput = document.getElementById('base-amount-input');
const baseAmountGroup = document.getElementById('base-amount-group');
const strategyNameDisplay = document.getElementById('strategy-name-display');
const startBtn = document.getElementById('start-sim-btn');
const toggleBtn = document.getElementById('toggle-sim-btn');
const speedSlider = document.getElementById('speed-slider');

const balanceEl = document.getElementById('account-balance');
const positionEl = document.getElementById('current-position');
const totalCostEl = document.getElementById('total-cost');
const unrealizedPnlEl = document.getElementById('unrealized-pnl');
const totalEquityEl = document.getElementById('total-equity');
const logsEl = document.getElementById('trade-logs');
const pnlLegendEl = document.getElementById('pnl-legend');
const costLegendEl = document.getElementById('cost-legend');

// Toggle DCA settings visibility
strategySelect.addEventListener('change', (e) => {
    if (e.target.value === 'dca' || e.target.value === 'gump') {
        dcaFreqGroup.style.display = 'flex';
    } else {
        dcaFreqGroup.style.display = 'none';
    }

    if (e.target.value === 'allin') {
        baseAmountGroup.style.display = 'none';
    } else {
        baseAmountGroup.style.display = 'flex';
    }
    strategySelect.blur();
});

simYearsSelect.addEventListener('change', () => simYearsSelect.blur());
assetSelect.addEventListener('change', () => assetSelect.blur());
dcaFreqSelect.addEventListener('change', () => dcaFreqSelect.blur());

// Blur inputs on enter key
baseAmountInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        baseAmountInput.blur();
    }
});

// Click background to blur active element
document.addEventListener('click', (e) => {
    const tagName = e.target.tagName;
    if (tagName !== 'SELECT' && tagName !== 'INPUT' && tagName !== 'BUTTON') {
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
        }
    }
});

// Use Left/Right arrow keys to pan the chart horizontally
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const timeScale = chart.timeScale();
        const visibleRange = timeScale.getVisibleLogicalRange();
        if (!visibleRange) return;
        
        // Shift by 5 bars per key press (adjust if needed)
        const shift = e.key === 'ArrowLeft' ? -5 : 5;
        timeScale.setVisibleLogicalRange({
            from: visibleRange.from + shift,
            to: visibleRange.to + shift
        });
    }
});

if (speedSlider) {
    speedSlider.addEventListener('input', (e) => {
        playbackSpeed = parseFloat(e.target.value);
        currentDelay = BASE_DELAY / playbackSpeed;
        const speedInd = document.getElementById('speed-indicator');
        if (speedInd) speedInd.innerText = playbackSpeed.toFixed(2);
    });
    speedSlider.addEventListener('change', () => speedSlider.blur());
}

// Simulation State
const BASE_DELAY = 53; // 1.25x faster than previous 66ms (approx 53ms)
let balance = 2000000; // 2 million initial cash for DCA to run a long time
let position = 0;
let avgPrice = 0;
let simTimeoutID = null;
let isRunning = false;
let streamingDataProvider = null;
let playbackSpeed = 1.0;
let currentDelay = BASE_DELAY; // default speed (66ms base / playbackSpeed)
let targetDelay = BASE_DELAY;
let recoveryTimeoutID = null;
let lastTime = 0;
let accumulator = 0;

let currentMarketData = null; // Cache for current data
let originalInitialData = null; // Keep a deep copy of initial data
let pnlHistory = new Map();

let currentPnlStr = 'PnL: $0.00 (0.00%)';
let currentPnlColor = '#d1d5db';
let currentCostStr = '持有成本: $0.00';
let isCrosshairActive = false;
let currentMarkers = [];

// Strategy State
let daysPassed = 0;
let allTimeHigh = 0;
let localHigh = 0;
let localLow = Infinity;
let inDip = false;
let prevSma20 = null;
let prevSma60 = null;
let relativeHighHistory = [];
let lastAddonTier = 0;

async function startSimulationWithNewData() {
    // 取消上一個未完成的請求
    if (activeAbortController) {
        activeAbortController.abort();
    }
    activeAbortController = new AbortController();

    startBtn.disabled = true;
    startBtn.innerText = '載入中...';
    assetSelect.disabled = true;
    simYearsSelect.disabled = true;
    strategySelect.disabled = true;

    try {
        const asset = assetSelect.value;
        const years = parseInt(simYearsSelect.value) || 5;
        const historyCount = 100; // 先在圖表上保留 100 天的 K 線以供參考
        const requiredCount = years * 252; // 模擬所需天數

        let allCandles = await loadAssetData(asset);

        // 預先計算 SMA
        for (let i = 0; i < allCandles.length; i++) {
            let sum20 = 0, sum60 = 0;
            let count20 = 0, count60 = 0;
            for (let j = i; j >= Math.max(0, i - 19); j--) {
                sum20 += allCandles[j].close;
                count20++;
            }
            for (let j = i; j >= Math.max(0, i - 59); j--) {
                sum60 += allCandles[j].close;
                count60++;
            }
            if (count20 === 20) allCandles[i].sma20 = sum20 / 20;
            if (count60 === 60) allCandles[i].sma60 = sum60 / 60;
        }

        // 擷取指定年份的回測區間
        const totalNeeded = requiredCount + historyCount;
        if (allCandles.length > totalNeeded) {
            allCandles = allCandles.slice(allCandles.length - totalNeeded);
        }

        const initialData = [];
        const realtimeUpdates = [];

        // 切割資料
        for (let i = 0; i < allCandles.length; i++) {
            if (i < historyCount && i < allCandles.length - 1) {
                initialData.push(allCandles[i]);
            } else {
                realtimeUpdates.push(allCandles[i]);
            }
        }

        currentMarketData = { initialData, realtimeUpdates };
        originalInitialData = JSON.parse(JSON.stringify(currentMarketData.initialData)); // deep copy

        resetSimulation();
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('先前下載請求已被取消');
                return;
            }
            console.error("載入資料失敗:", error);
            alert("載入資料失敗，請確認伺服器有正確執行。錯誤: " + error.message);
        } finally {
            startBtn.disabled = false;
            startBtn.innerText = '重新開始';
            assetSelect.disabled = false;
            simYearsSelect.disabled = false;
            strategySelect.disabled = false;
        }
    }

function resetSimulation() {
    if (simTimeoutID) cancelAnimationFrame(simTimeoutID);

    // Reset States
    balance = 2000000;
    position = 0;
    avgPrice = 0;
    playbackSpeed = speedSlider ? parseFloat(speedSlider.value) : 1.0;
    currentDelay = BASE_DELAY / playbackSpeed;
    targetDelay = BASE_DELAY / playbackSpeed;
    const speedInd = document.getElementById('speed-indicator');
    if (speedInd) speedInd.innerText = playbackSpeed.toFixed(2);
    if (recoveryTimeoutID) clearTimeout(recoveryTimeoutID);
    daysPassed = 0;
    allTimeHigh = 0;
    localHigh = 0;
    localLow = Infinity;
    inDip = false;
    relativeHighHistory = [];
    lastAddonTier = 0;
    logsEl.innerHTML = '';

    strategyNameDisplay.innerText = strategySelect.options[strategySelect.selectedIndex].text;

    if (!currentMarketData) {
        startSimulationWithNewData();
        return;
    }

    // Clear and redraw chart
    chart.removeSeries(candleSeries);
    if (sma20Series) chart.removeSeries(sma20Series);
    if (sma60Series) chart.removeSeries(sma60Series);
    if (volumeSeries) volumeChart.removeSeries(volumeSeries);

    candleSeries = addCandlestickSeriesHelper(chart, {
        upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    });

    volumeSeries = addHistogramSeriesHelper(volumeChart, {
        color: '#26a69a',
        priceFormat: { type: 'volume' },
    });

    sma20Series = addLineSeriesHelper(chart, { color: '#4caf50', lineWidth: 2, crosshairMarkerVisible: false });
    sma60Series = addLineSeriesHelper(chart, { color: '#2196f3', lineWidth: 2, crosshairMarkerVisible: false });

    pnlChart.removeSeries(pnlSeries);
    pnlSeries = addBaselineSeriesHelper(pnlChart, {
        baseValue: { type: 'price', price: 2000000 },
        topLineColor: 'rgba(38, 166, 154, 1)',
        topFillColor1: 'rgba(38, 166, 154, 0.28)',
        topFillColor2: 'rgba(38, 166, 154, 0.05)',
        bottomLineColor: 'rgba(239, 83, 80, 1)',
        bottomFillColor1: 'rgba(239, 83, 80, 0.05)',
        bottomFillColor2: 'rgba(239, 83, 80, 0.28)',
    });

    // Use the deep copy to prevent mutation
    candleSeries.setData(originalInitialData.map(c => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
    })));

    const sma20Data = originalInitialData.filter(c => c.sma20 !== undefined).map(c => ({ time: c.time, value: c.sma20 }));
    const sma60Data = originalInitialData.filter(c => c.sma60 !== undefined).map(c => ({ time: c.time, value: c.sma60 }));
    const volumeData = originalInitialData.filter(c => c.volume !== undefined).map(c => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
    }));

    sma20Series.setData(sma20Data);
    sma60Series.setData(sma60Data);
    if (volumeSeries) volumeSeries.setData(volumeData);

    pnlHistory.clear();
    const initialPnlData = originalInitialData.map(c => {
        pnlHistory.set(c.time, { equity: 2000000, cost: 0 });
        return { time: c.time, value: 2000000 };
    });
    pnlSeries.setData(initialPnlData);

    // Reset Y-axis auto scale in case user manually dragged it
    chart.priceScale('right').applyOptions({ autoScale: true });
    volumeChart.priceScale('right').applyOptions({ autoScale: true });
    pnlChart.priceScale('right').applyOptions({ autoScale: true });

    currentMarkers = [];

    // 讓畫面固定只顯示 100 根 K 線的寬度
    const totalLen = originalInitialData.length;
    chart.timeScale().setVisibleLogicalRange({
        from: totalLen - 100,
        to: totalLen
    });

    streamingDataProvider = getNextRealtimeUpdate(currentMarketData.realtimeUpdates);

    if (originalInitialData.length > 0) {
        const lastCandle = originalInitialData[originalInitialData.length - 1];
        // 歷史新高與近期高點應從整個 originalInitialData 尋找最大值
        const maxHigh = Math.max(...originalInitialData.map(c => c.high));
        allTimeHigh = maxHigh;
        localHigh = maxHigh;
        
        prevSma20 = lastCandle.sma20;
        prevSma60 = lastCandle.sma60;
        updateUI(lastCandle.close);
    } else {
        prevSma20 = null;
        prevSma60 = null;
    }

    isRunning = true;
    toggleBtn.innerText = '暫停';
    toggleBtn.disabled = false;
    lastTime = 0;
    simTimeoutID = requestAnimationFrame(tick);
}

function updateUI(currentPrice) {
    balanceEl.innerText = balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (position > 0) {
        positionEl.innerText = `持倉 (${position.toFixed(2)} 單位)`;
        positionEl.className = 'badge long';
        const totalCost = position * avgPrice;
        totalCostEl.innerText = totalCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

        const pnl = (currentPrice - avgPrice) * position;
        const pnlPercent = totalCost > 0 ? (pnl / totalCost * 100) : 0; // Position return
        const pnlStr = (pnl >= 0 ? '+' : '') + pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) + ` (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)`;

        unrealizedPnlEl.innerText = pnlStr;
        unrealizedPnlEl.className = pnl >= 0 ? 'profit' : 'loss';

        const equity = balance + (currentPrice * position);
        totalEquityEl.innerText = equity.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

        // Store globally for crosshair logic
        const costStr = totalCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        currentPnlStr = `PnL: ${pnlStr}`;
        currentPnlColor = pnl >= 0 ? '#26a69a' : '#ef5350';
        currentCostStr = `持有成本: ${costStr}`;

        if (!isCrosshairActive) {
            pnlLegendEl.innerText = currentPnlStr;
            pnlLegendEl.style.color = currentPnlColor;
            costLegendEl.innerText = currentCostStr;
        }
    } else {
        positionEl.innerText = '空手 (0)';
        positionEl.className = 'badge neutral';
        totalCostEl.innerText = '$0.00';
        unrealizedPnlEl.innerText = '$0.00';
        unrealizedPnlEl.className = 'neutral';
        totalEquityEl.innerText = balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

        currentPnlStr = `PnL: $0.00 (0.00%)`;
        currentPnlColor = '#d1d5db';
        currentCostStr = `持有成本: $0.00`;

        if (!isCrosshairActive) {
            pnlLegendEl.innerText = currentPnlStr;
            pnlLegendEl.style.color = currentPnlColor;
            costLegendEl.innerText = currentCostStr;
        }
    }
}

function addLog(text, time, type = 'buy') {
    const li = document.createElement('li');
    li.className = `log-item ${type}`;
    let dateStr = time;
    if (typeof time === 'number') {
        const date = new Date(time * 1000);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        dateStr = `${yyyy}/${mm}/${dd}`; // 使用 2026/04/26 格式
    }

    let actionText = type === 'buy' ? '買入' : '賣出';

    li.innerHTML = `<span class="log-time">${dateStr}</span><strong>${actionText}</strong> ${text}`;
    logsEl.prepend(li);
}

function executeBuy(amountToSpend, price, time, reason) {
    if (balance > 0) {
        // Prevent spending more than we have
        const actualSpend = Math.min(amountToSpend, balance);
        const units = actualSpend / price;
        balance -= actualSpend;
        const totalCost = (position * avgPrice) + actualSpend;
        position += units;
        avgPrice = totalCost / position;

        const formattedAmount = `$${actualSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        addLog(`${formattedAmount} (${reason})`, time);

        const isDipBuy = reason.toLowerCase().includes('逢低buy');
        const markerColor = isDipBuy ? '#ff9800' : '#26a69a'; // 逢低Buy用橘色，一般買入為綠色
        const markerText = isDipBuy ? '逢低Buy' : 'buy';

        const existingMarker = currentMarkers.find(m => m.time === time);
        if (existingMarker) {
            if (!existingMarker.text.includes(markerText)) existingMarker.text += ` & ${markerText}`;
            existingMarker.color = '#e91e63';
        } else {
            currentMarkers.push({
                time: time,
                position: 'belowBar',
                color: markerColor,
                shape: 'arrowUp',
                text: markerText
            });
            currentMarkers.sort((a, b) => {
                if (typeof a.time === 'string' && typeof b.time === 'string') {
                    return a.time.localeCompare(b.time);
                }
                return a.time - b.time;
            });
        }
        setSeriesMarkers(candleSeries, currentMarkers);
    }
}

function executeSell(unitsToSell, price, time, reason) {
    if (position > 0) {
        const actualSell = Math.min(unitsToSell, position);
        const cashValue = actualSell * price;
        balance += cashValue;
        position -= actualSell;

        if (position === 0) avgPrice = 0; // reset

        const formattedAmount = `$${cashValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        addLog(`${formattedAmount} (${reason})`, time, 'sell');

        const existingMarker = currentMarkers.find(m => m.time === time);
        if (existingMarker) {
            if (!existingMarker.text.includes('sell')) existingMarker.text += ' & sell';
            existingMarker.color = '#e91e63';
        } else {
            currentMarkers.push({
                time: time,
                position: 'aboveBar',
                color: '#ef5350', // 賣出為紅色
                shape: 'arrowDown',
                text: 'sell'
            });
            currentMarkers.sort((a, b) => {
                if (typeof a.time === 'string' && typeof b.time === 'string') {
                    return a.time.localeCompare(b.time);
                }
                return a.time - b.time;
            });
        }
        setSeriesMarkers(candleSeries, currentMarkers);
    }
}

function processStrategy(candle) {
    daysPassed++;
    const price = candle.close;
    if (candle.high > allTimeHigh) allTimeHigh = candle.high;

    const strategy = strategySelect.value;
    const freq = parseInt(dcaFreqSelect.value);
    const baseAmount = parseInt(baseAmountInput.value) || 20000; // Base buy amount per unit

    if (strategy === 'allin') {
        if (daysPassed === 1) {
            executeBuy(balance, price, candle.time, 'All In 全壓');
        }
    }
    else if (strategy === 'dca') {
        if (daysPassed % freq === 0) {
            executeBuy(baseAmount, price, candle.time, '定期定額');
        }
    }
    else if (strategy === 'gump') {
        if (daysPassed % freq === 0) {
            const drawdown = (allTimeHigh - price) / allTimeHigh;
            let multiplier = 1;
            let reason = '阿甘買入';

            if (drawdown >= 0.20) {
                multiplier = 5;
                reason = '大跌抄底 x5';
            } else if (drawdown >= 0.10) {
                multiplier = 3;
                reason = '逢低加碼 x3';
            }

            executeBuy(baseAmount * multiplier, price, candle.time, reason);
        }
    }
    else if (strategy === 'buy_dip') {
        // 相對低點投入邏輯 (兩個高點中的最低價)
        // 實作：當價格從近期高點回落大於 5% 視為進入谷底區，當從谷底反彈 3% 時，確認低點形成並買入
        if (price > localHigh) {
            localHigh = price;
            inDip = false; // 創近期新高，脫離谷底
        }

        const currentDrawdown = (localHigh - price) / localHigh;
        if (currentDrawdown >= 0.05 && !inDip) {
            inDip = true; // 進入大於 5% 的回檔
            localLow = price;
        }
        else if (inDip) { // 使用 else if 避免同一個 tick 被重複計算
            if (price < localLow) {
                localLow = price; // 更新谷底最低價
            } else {
                const rebound = (price - localLow) / localLow;
                if (rebound >= 0.03) {
                    // 反彈 3%，確認低點已經形成
                    executeBuy(baseAmount * 5, price, candle.time, '波段低點買入');
                    inDip = false;
                    // 移除 localHigh = price; 讓它保持原先的高點基準，直到市場真正創高
                }
            }
        }
    }
    else if (strategy === 'dca_relative_high') {
        if (daysPassed % freq === 0) {
            executeBuy(baseAmount, price, candle.time, '定期定額');
        }

        // 創新高時，重置加碼級距
        if (candle.high >= allTimeHigh) {
            lastAddonTier = 0;
        }

        // 使用歷史高點計算回檔
        const drawdown = (allTimeHigh - price) / allTimeHigh;
        const currentTier = Math.floor(drawdown / 0.10); // 10% 為一個級距

        if (currentTier > lastAddonTier) {
            const tiersToBuy = currentTier - lastAddonTier;
            for (let i = 0; i < tiersToBuy; i++) {
                const addOnTier = lastAddonTier + i + 1;
                let multiplier = 1.5;
                if (addOnTier === 2) multiplier = 3.0;
                if (addOnTier >= 3) multiplier = 5.0;
                
                executeBuy(baseAmount * multiplier, price, candle.time, '逢低Buy');
            }
            lastAddonTier = currentTier;
        }
    }
    else if (strategy === 'ma_cross') {
        const curSma20 = candle.sma20;
        const curSma60 = candle.sma60;

        if (curSma20 !== undefined && curSma60 !== undefined && prevSma20 !== undefined && prevSma60 !== undefined) {
            // 黃金交叉買入 (全壓)
            if (curSma20 > curSma60 && prevSma20 <= prevSma60) {
                executeBuy(balance, price, candle.time, '黃金交叉買進');
            }
            // 死亡交叉賣出 (全出)
            else if (curSma20 < curSma60 && prevSma20 >= prevSma60) {
                if (position > 0) {
                    executeSell(position, price, candle.time, '死亡交叉賣出');
                }
            }
        }

        prevSma20 = curSma20;
        prevSma60 = curSma60;
    }

    updateUI(price);
}

function* getNextRealtimeUpdate(realtimeData) {
    for (const dataPoint of realtimeData) yield dataPoint;
    return null;
}

function tick(timestamp) {
    if (!isRunning) return;

    if (!lastTime) lastTime = timestamp;
    const elapsed = timestamp - lastTime;
    lastTime = timestamp;

    // Limit elapsed time to prevent giant jumps when tab is inactive
    const dt = Math.min(elapsed, 100);

    accumulator += dt;

    const delayPerCandle = BASE_DELAY / playbackSpeed;

    while (accumulator >= delayPerCandle) {
        const update = streamingDataProvider.next();
        if (update.done) {
            toggleBtn.innerText = '模擬結束';
            toggleBtn.disabled = true;
            isRunning = false;
            return;
        }

        const candle = update.value;
        candleSeries.update({
            time: candle.time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close
        });

        if (candle.volume !== undefined && volumeSeries) {
            volumeSeries.update({
                time: candle.time,
                value: candle.volume,
                color: candle.close >= candle.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
            });
        }

        if (candle.sma20 !== undefined) sma20Series.update({ time: candle.time, value: candle.sma20 });
        if (candle.sma60 !== undefined) sma60Series.update({ time: candle.time, value: candle.sma60 });

        processStrategy(candle);

        // Update PnL Chart
        const currentEquity = balance + (candle.close * position);
        pnlSeries.update({ time: candle.time, value: currentEquity });
        const currentCost = position * avgPrice;
        pnlHistory.set(candle.time, { equity: currentEquity, cost: currentCost });

        accumulator -= delayPerCandle;
    }

    if (isRunning) {
        simTimeoutID = requestAnimationFrame(tick);
    }
}

startBtn.addEventListener('click', () => {
    startBtn.blur();
    startSimulationWithNewData();
});

toggleBtn.addEventListener('click', () => {
    toggleBtn.blur();
    if (isRunning) {
        isRunning = false;
        cancelAnimationFrame(simTimeoutID);
        toggleBtn.innerText = '繼續';
    } else {
        isRunning = true;
        lastTime = 0;
        simTimeoutID = requestAnimationFrame(tick);
        toggleBtn.innerText = '暫停';
    }
});

// Spacebar to pause/resume and Up/Down to change speed
window.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement ? document.activeElement.tagName : '';
    if (activeTag === 'INPUT' || activeTag === 'SELECT') return;

    if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault(); // Prevent page scroll
        toggleBtn.click();
    } else if (e.code === 'ArrowUp' || e.key === 'ArrowUp' || e.key === 'Up') {
        e.preventDefault();
        playbackSpeed += 0.25;
        if (playbackSpeed > 10.0) playbackSpeed = 10.0;
        currentDelay = BASE_DELAY / playbackSpeed;
        const speedInd = document.getElementById('speed-indicator');
        if (speedInd) speedInd.innerText = playbackSpeed.toFixed(2);
        if (speedSlider) speedSlider.value = playbackSpeed;
    } else if (e.code === 'ArrowDown' || e.key === 'ArrowDown' || e.key === 'Down') {
        e.preventDefault();
        playbackSpeed -= 0.25;
        if (playbackSpeed < 0.25) playbackSpeed = 0.25;
        currentDelay = BASE_DELAY / playbackSpeed;
        const speedInd = document.getElementById('speed-indicator');
        if (speedInd) speedInd.innerText = playbackSpeed.toFixed(2);
        if (speedSlider) speedSlider.value = playbackSpeed;
    }
}, true);

// Crosshair interaction
const crosshairTop = document.getElementById('crosshair-top');
const crosshairBottom = document.getElementById('crosshair-bottom');

function updateCustomCrosshair(x) {
    if (x === null) {
        crosshairTop.style.display = 'none';
        crosshairBottom.style.display = 'none';
    } else {
        crosshairTop.style.display = 'block';
        crosshairBottom.style.display = 'block';
        crosshairTop.style.left = x + 'px';
        crosshairBottom.style.left = x + 'px';
    }
}

function handleCrosshairMoveChart(param) {
    if (param.point === undefined || !param.time || param.point.x < 0 || param.point.y < 0) {
        updateCustomCrosshair(null);
        return;
    }

    updateCustomCrosshair(param.point.x);
}

function handleCrosshairMovePnl(param) {
    if (param.point === undefined || !param.time || param.point.x < 0 || param.point.y < 0) {
        isCrosshairActive = false;
        pnlLegendEl.innerText = currentPnlStr;
        pnlLegendEl.style.color = currentPnlColor;
        costLegendEl.innerText = currentCostStr;
        updateCustomCrosshair(null);
        return;
    }

    const historyData = pnlHistory.get(param.time);
    if (historyData !== undefined) {
        isCrosshairActive = true;
        // The value stored could be a number (from before) or object
        const equityVal = typeof historyData === 'object' ? historyData.equity : historyData;
        const costVal = typeof historyData === 'object' ? historyData.cost : 0;

        const pnl = equityVal - 2000000;
        const pnlPercent = costVal > 0 ? (pnl / costVal) * 100 : 0;
        const pnlStr = (pnl >= 0 ? '+' : '') + pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) + ` (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)`;
        const costStr = costVal.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

        pnlLegendEl.innerText = `PnL: ${pnlStr}`;
        pnlLegendEl.style.color = pnl >= 0 ? '#26a69a' : '#ef5350';
        costLegendEl.innerText = `持有成本: ${costStr}`;
    }

    updateCustomCrosshair(param.point.x);
}

chart.subscribeCrosshairMove(handleCrosshairMoveChart);
pnlChart.subscribeCrosshairMove(handleCrosshairMovePnl);

// Resize handler
window.addEventListener('resize', () => {
    chart.applyOptions({ width: domContainer.clientWidth, height: domContainer.clientHeight });
    pnlChart.applyOptions({ width: pnlContainer.clientWidth, height: pnlContainer.clientHeight });
});
chart.applyOptions({ width: domContainer.clientWidth, height: domContainer.clientHeight });
pnlChart.applyOptions({ width: pnlContainer.clientWidth, height: pnlContainer.clientHeight });

// Initialize first simulation on load
startSimulationWithNewData();
