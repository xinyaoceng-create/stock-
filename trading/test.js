let randomFactor = 25 + Math.random() * 25;
const samplePoint = i => i * (0.5 + Math.sin(i / 10) * 0.2 + Math.sin(i / 20) * 0.4 + Math.sin(i / randomFactor) * 0.8 + Math.sin(i / 500) * 0.5) + 200 + i * 2;

function generateData(numberOfCandles = 500, updatesPerCandle = 5, startAt = 100) {
    const createCandle = (val, time) => ({ time, open: val, high: val, low: val, close: val });
    const updateCandle = (candle, val) => ({
        time: candle.time,
        close: val,
        open: candle.open,
        low: Math.min(candle.low, val),
        high: Math.max(candle.high, val),
    });

    randomFactor = 25 + Math.random() * 25;
    const date = new Date(Date.UTC(2023, 0, 1, 12, 0, 0, 0));
    const numberOfPoints = numberOfCandles * updatesPerCandle;
    const initialData = [];
    const realtimeUpdates = [];
    let lastCandle;
    let previousValue = samplePoint(-1);

    for (let i = 0; i < numberOfPoints; ++i) {
        if (i % updatesPerCandle === 0) {
            date.setUTCDate(date.getUTCDate() + 1);
        }
        const time = date.getTime() / 1000;
        let value = samplePoint(i);
        const diff = (value - previousValue) * (Math.random() * 2 - 0.5);
        value = previousValue + diff;
        previousValue = value;

        if (i % updatesPerCandle === 0) {
            const candle = createCandle(value, time);
            lastCandle = candle;
            if (i >= startAt) realtimeUpdates.push(candle);
        } else {
            const newCandle = updateCandle(lastCandle, value);
            lastCandle = newCandle;
            if (i >= startAt) realtimeUpdates.push(newCandle);
            else if ((i + 1) % updatesPerCandle === 0) initialData.push(newCandle);
        }
    }
    return { initialData, realtimeUpdates };
}

console.log("Generating data...");
const data = generateData(1000, 5, 500);
console.log("Initial Data length:", data.initialData.length);
if (data.initialData.length > 0) {
    console.log("First item:", data.initialData[0]);
    console.log("Last item:", data.initialData[data.initialData.length - 1]);
}
