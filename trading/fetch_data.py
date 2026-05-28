import yfinance as yf
import pandas as pd
import json
import os

ASSETS = {
    '0050': '0050.TW',
    'sp500': '^GSPC',
    'tsmc': '2330.TW',
    '00631L': '00631L.TW',
    'nvda': 'NVDA',
    'tsla': 'TSLA'
}

def fetch_and_save():
    os.makedirs('data', exist_ok=True)
    
    for key, ticker in ASSETS.items():
        print(f"Fetching {ticker} for {key}...")
        try:
            # Fetch max historical data
            data = yf.download(ticker, period="max")
            if data.empty:
                print(f"Warning: No data found for {ticker}")
                continue
                
            # Keep only the columns we need
            data = data[['Open', 'High', 'Low', 'Close', 'Volume']]
            
            # Flatten multi-level columns if any (yfinance latest versions sometimes return MultiIndex columns)
            if isinstance(data.columns, pd.MultiIndex):
                data.columns = data.columns.get_level_values(0)
                
            # Drop rows with NaN values
            data = data.dropna()
            
            # Reset index to get Date as a column
            data = data.reset_index()
            
            # Rename columns to lowercase for JS
            data.rename(columns={'Date': 'time', 'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'volume'}, inplace=True)
            
            # --- Custom split adjustment logic ---
            data['year'] = data['time'].dt.year
            df_2013 = data[data['year'] == 2013]
            df_2014 = data[data['year'] == 2014]
            # Only apply this specific fix for 0050.TW
            if ticker == '0050.TW' and not df_2013.empty and not df_2014.empty:
                last_2013_close = df_2013.iloc[-1]['close']
                first_2014_close = df_2014.iloc[0]['close']
                
                if 3.5 < (last_2013_close / first_2014_close) < 4.5:
                    print(f"Applying 4:1 split adjustment for {ticker} before 2014")
                    mask = data['year'] <= 2013
                    data.loc[mask, ['open', 'high', 'low', 'close']] /= 4
                    data.loc[mask, 'volume'] *= 4
            
            data = data.drop(columns=['year'])
            # ------------------------------------
            
            # Format time as 'YYYY-MM-DD'
            data['time'] = data['time'].dt.strftime('%Y-%m-%d')
            
            # Convert to list of dicts
            records = data.to_dict(orient='records')
            
            # Save to JSON
            out_path = f"data/{key}.json"
            with open(out_path, 'w', encoding='utf-8') as f:
                json.dump(records, f)
                
            print(f"Saved {len(records)} records to {out_path}")
            
        except Exception as e:
            print(f"Error fetching {ticker}: {e}")

if __name__ == "__main__":
    fetch_and_save()
