import {describe, it} from "vitest";
import {subscribeToFuturesTicker, subscribeToOptionsTicker, subscribeToTrades} from "./subscribe-to-stream";
import fs from 'node:fs'
import path from "node:path";

function prettyFormat(object: object) {
    const transformed = Object.entries(object).reduce((acc, [key, value]) => {
        if (key.toLowerCase().includes("time")) {
            return {
                ...acc,
                [key]: new Date(value).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'})
            }
        }
        return {...acc, [key]: value}
    }, {} as any)
    return JSON.stringify(transformed)
}

async function storingIterable<T extends object>(file: string, iterable: AsyncIterable<T>) {
    const reportsFolderPath = path.join(__dirname, '../reports')
    try {
        await fs.promises.mkdir(reportsFolderPath)
    } catch (ignore) {
    }
    //appends the file
    const stream = await fs.promises.open(path.join(reportsFolderPath, file), 'a')
    for await (const value of iterable) {
        const pretty = prettyFormat(value)
        console.log(pretty)
        await stream.write(pretty + '\n')
        await stream.datasync()
    }
}

describe("Binance Websockets", () => {
    it("should subscribe to data", async () => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        await Promise.all([
            storingIterable('BTCUSDT_trades.txt', subscribeToTrades({pairs: ['BTCUSDT'], frequencyInSeconds: 3})),
            storingIterable('BTCUSDT_futures_ticker.txt', subscribeToFuturesTicker({
                pairs: ['BTCUSDT'],
                frequencyInSeconds: 3
            })),
            storingIterable('BTC_options_ticker.txt', subscribeToOptionsTicker({
                asset: 'BTC',
                frequencyInSeconds: 3,
                localDate: tomorrow
            })),
        ])
    }, 60_000);
})
