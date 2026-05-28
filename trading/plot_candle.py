import pandas as pd
import mplfinance as mpf
import json
import matplotlib.pyplot as plt

# Load JSON data
with open('data/0050.json', 'r') as f:
    data = json.load(f)

# Convert to DataFrame
df = pd.DataFrame(data)
df['time'] = pd.to_datetime(df['time'])
df.set_index('time', inplace=True)
df.columns = ['Open', 'High', 'Low', 'Close']

# Slice to last 5 years
df = df.tail(1260)

# Calculate SMAs
df['SMA20'] = df['Close'].rolling(window=20).mean()
df['SMA60'] = df['Close'].rolling(window=60).mean()

# Add SMA plots
apds = [
    mpf.make_addplot(df['SMA20'], color='g'),
    mpf.make_addplot(df['SMA60'], color='b')
]

# Plot candlestick chart
mpf.plot(df, type='candle', addplot=apds, volume=False, style='yahoo', title='0050 Candlestick Chart (5 Years)', savefig='0050_candle_chart.png')
print("Chart saved as 0050_candle_chart.png")
