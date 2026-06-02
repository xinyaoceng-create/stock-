import yfinance as yf
import pandas as pd
import json
import os
import subprocess
import sys

# Ensure FinMind is installed
try:
    import FinMind
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "FinMind"])
from FinMind.data import DataLoader

ASSETS = {
    'sp500': '^GSPC',
    'tsmc': '2330.TW',
    '00631L': '00631L.TW',
    'nvda': 'NVDA',
    'tsla': 'TSLA'
}

def fetch_and_save():
    os.makedirs('data', exist_ok=True)
    
    # 1. Fetch 0050 from TWSE via FinMind
    print("Fetching 0050 from TWSE (via FinMind)...")
    try:
        dl = DataLoader()
        data_0050 = dl.taiwan_stock_daily(stock_id='0050', start_date='2003-01-01')
        if not data_0050.empty:
            # --- Calculate Adjusted Prices for 0050 ---
            div_0050 = dl.taiwan_stock_dividend(stock_id='0050', start_date='2003-01-01')
            if not div_0050.empty and 'CashExDividendTradingDate' in div_0050.columns:
                data_0050['date'] = pd.to_datetime(data_0050['date'])
                data_0050 = data_0050.sort_values('date').reset_index(drop=True)
                data_0050['adj_ratio'] = 1.0
                
                div_0050['CashExDividendTradingDate'] = pd.to_datetime(div_0050['CashExDividendTradingDate'])
                div_0050 = div_0050.dropna(subset=['CashExDividendTradingDate', 'CashEarningsDistribution'])
                div_0050 = div_0050.sort_values('CashExDividendTradingDate', ascending=False)
                
                for _, row in div_0050.iterrows():
                    ex_date = row['CashExDividendTradingDate']
                    div_amt = row['CashEarningsDistribution']
                    
                    before_ex = data_0050[data_0050['date'] < ex_date]
                    if not before_ex.empty:
                        t_minus_1_idx = before_ex.index[-1]
                        c = data_0050.loc[t_minus_1_idx, 'close']
                        if c > 0:
                            ratio = (c - div_amt) / c
                            data_0050.loc[:t_minus_1_idx, 'adj_ratio'] *= ratio
                            
                for col in ['open', 'max', 'min', 'close']:
                    data_0050[col] = (data_0050[col] * data_0050['adj_ratio']).round(2)
                
                data_0050['date'] = data_0050['date'].dt.strftime('%Y-%m-%d')
            # ------------------------------------------

            # --- Manual Split Adjustment (<= 2025-06-10) ---
            split_mask = data_0050['date'] <= '2025-06-10'
            for col in ['open', 'max', 'min', 'close']:
                data_0050.loc[split_mask, col] = (data_0050.loc[split_mask, col] / 4).round(2)
            data_0050.loc[split_mask, 'Trading_Volume'] *= 4
            # --------------------------------------------

            data_0050 = data_0050[['date', 'open', 'max', 'min', 'close', 'Trading_Volume']]
            data_0050.rename(columns={'date': 'time', 'max': 'high', 'min': 'low', 'Trading_Volume': 'volume'}, inplace=True)
            records = data_0050.to_dict(orient='records')
            with open('data/0050.json', 'w', encoding='utf-8') as f:
                json.dump(records, f)
            print(f"Saved {len(records)} records to data/0050.json")
        else:
            print("Warning: No data found for 0050 from FinMind")
    except Exception as e:
        print(f"Error fetching 0050: {e}")
    
    # 2. Fetch others from Yahoo Finance
    for key, ticker in ASSETS.items():
        print(f"Fetching {ticker} for {key}...")
        try:
            data = yf.download(ticker, period="max")
            if data.empty:
                print(f"Warning: No data found for {ticker}")
                continue
                
            if isinstance(data.columns, pd.MultiIndex):
                data.columns = data.columns.get_level_values(0)
            data = data.dropna()
            
            # --- Use Adj Close to adjust prices ---
            if 'Adj Close' in data.columns and 'Close' in data.columns:
                adj_ratio = data['Adj Close'] / data['Close']
                data['Open'] = (data['Open'] * adj_ratio).round(2)
                data['High'] = (data['High'] * adj_ratio).round(2)
                data['Low'] = (data['Low'] * adj_ratio).round(2)
                data['Close'] = data['Adj Close'].round(2)
            # --------------------------------------

            data = data[['Open', 'High', 'Low', 'Close', 'Volume']]
            data = data.reset_index()
            data.rename(columns={'Date': 'time', 'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'volume'}, inplace=True)
            data['time'] = data['time'].dt.strftime('%Y-%m-%d')
            
            records = data.to_dict(orient='records')
            out_path = f"data/{key}.json"
            with open(out_path, 'w', encoding='utf-8') as f:
                json.dump(records, f)
            print(f"Saved {len(records)} records to {out_path}")
        except Exception as e:
            print(f"Error fetching {ticker}: {e}")

if __name__ == "__main__":
    fetch_and_save()
