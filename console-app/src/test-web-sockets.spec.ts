import {describe, it} from "vitest";
import {
    subscribeToFuturesTicker,
    subscribeToOptionsTicker,
    subscribeToTrades
} from "./subscribe-to-stream";
import fs from 'node:fs'
import path from "node:path";
import { format } from '@fast-csv/format';

function prettyFormat(object: object) {
    return Object.entries(object).reduce((acc, [key, value]) => {
        if (key.toLowerCase().includes("time")) {
            return {
                ...acc,
                [key]: new Date(value).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'})
            }
        }
        return {...acc, [key]: value}
    }, {} as any)
}

async function storingIterable<T extends object>(file: string, iterable: AsyncIterable<T>) {
    const reportsFolderPath = path.join(__dirname, '../reports')
    try {
        await fs.promises.mkdir(reportsFolderPath)
    } catch (ignore) {
    }
    const stream = fs.createWriteStream(path.join(reportsFolderPath, file), { flags: 'w' })
    const csvFormat = format({
        headers: true,
        objectMode: true
    });
    csvFormat.pipe(stream)
    for await (const value of iterable) {
        const pretty = prettyFormat(value)
        console.log(pretty)
        if (!csvFormat.write(pretty)) {
            await new Promise((resolve) => stream.once('drain', resolve))
        }
    }
}

describe("Binance Websockets", () => {
    it("should subscribe to data", async () => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        await Promise.all([
            storingIterable('BTCUSDT_trades.csv', subscribeToTrades({pairs: ['BTCUSDT'], frequencyInSeconds: 3})),
            storingIterable('BTCUSDT_futures_ticker.csv', subscribeToFuturesTicker({
                pairs: ['BTCUSDT'],
                frequencyInSeconds: 3
            })),
            storingIterable('BTC_options_ticker.csv', subscribeToOptionsTicker({
                asset: 'BTC',
                frequencyInSeconds: 3,
                localDate: tomorrow
            })),
        ])
    }, 60_000);
})
