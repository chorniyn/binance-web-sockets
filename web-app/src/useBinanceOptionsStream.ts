import {useEffect, useState} from "react";
import ReconnectingWebSocket from "reconnecting-websocket";

interface OptionRow {
    strikePrice: number
    call?: OptionTickerItem
    put?: OptionTickerItem
}
export const useBinanceOptionsStream = () => {
    const [options, setOptions] = useState<OptionRow[]>([])
    useEffect(() => {
        const {iterator, stop} = subscribeToOptionsTicker({
            asset: 'BTC',
            localDate: new Date(2024, 12 - 1, 4),
            frequencyInSeconds: 5
        });
        (async () => {
            for await (const updates of iterator()) {
                setOptions((prev) => {
                    const map = prev.reduce((acc, item) => {
                        acc.set(item.strikePrice, item)
                        return acc
                    }, new Map<number, OptionRow>())
                    for (const update of updates) {
                        const item = map.get(update.strikePrice)
                        if (item) {
                            map.set(update.strikePrice, {...item, ...(update.type === 'C' ? {call: update} : {put: update})})
                        } else {
                            const {strikePrice, type} = update
                            const call = type === 'C' ? update : undefined
                            const put = type === 'P' ? update : undefined
                            map.set(strikePrice, {strikePrice, call, put})
                        }
                    }
                    return Array.from(map.values()).sort((a, b) => a.strikePrice - b.strikePrice)
                })
            }
        })()
        return () => {
            stop()
        }
    }, []);
    return options
}


interface Stoppable {
    stop(): void;
}

class AsyncGeneratorFromCallback<T> implements Stoppable, AsyncIterable<T> {
    [Symbol.asyncIterator](): AsyncIterator<T, any, any> {
        return this.generate()
    }

    private listeners: ((value: T | undefined) => void)[] = [];
    private stopSignal = false;

    public callback(value: T): void {
        if (this.stopSignal) return;

        if (this.listeners.length > 0) {
            // Resolve the next listener immediately
            const listener = this.listeners.shift();
            listener?.(value);
        } else {
            // Queue the value for later consumption
            this.listeners.push(() => value);
        }
    }

    public stop(): void {
        this.stopSignal = true;
        this.listeners.forEach((listener) => listener(undefined)); // Notify all waiting listeners
        this.listeners = [];
    }


    public async* generate(): AsyncGenerator<T> {
        while (true) {
            const value = await new Promise<T | undefined>((resolve) => {
                if (this.stopSignal) resolve(undefined);
                else this.listeners.push(resolve);
            });

            if (value === undefined) break; // Stop iteration if stopped or no more values
            yield value;
        }
    }
}

class RateLimiter<T> implements AsyncIterable<T> {
    constructor(private iterable: AsyncIterable<T>, private frequency: number) {
    }

    private lastUpdate = Number.NEGATIVE_INFINITY;

    [Symbol
        .asyncIterator](): AsyncIterator<T, any, any> {
        return this.generate()
    }

    private async* generate(): AsyncGenerator<T> {
        for await (const value of this.iterable) {
            const now = Date.now();
            if (now - this.lastUpdate < this.frequency) {
                // Skip the value if it's too soon
                continue;
            }
            this.lastUpdate = now;
            yield value;
        }
    }
}

export function subscribeToBinanceUpdates<T>(callbackSetup: (callback: (value: T) => void) => Stoppable,
                                             frequencyInSeconds: number = 5) {
    const iterable = new AsyncGeneratorFromCallback<T>();
    const stoppable = callbackSetup((value) => iterable.callback(value));
    return {
        iterator: new RateLimiter(iterable, frequencyInSeconds * 1000),
        stoppable: {
            stop: () => {
                stoppable.stop()
                iterable.stop()
            }
        }
    }
}

function nativeBinanceSetup(stream: string, callback: (value: any[]) => void): Stoppable {
    const binanceWSUrl = 'wss://nbstream.binance.com/eoptions/ws';

    const rws = new ReconnectingWebSocket(`${binanceWSUrl}/${stream}`);

    rws.addEventListener('open', () => {
        console.info("WebSocket Opened", stream);
    });

    rws.addEventListener('message', (data) => {
        callback(JSON.parse(data.data));
    });

    rws.addEventListener('error', (error) => {
        console.error('WebSocket Error:', error, stream);
    });
    return {
        stop: () => rws.close()
    }
}

export type InferItem<T> = T extends AsyncIterable<infer U> ? U : never

export type OptionTickerItem = InferItem<ReturnType<ReturnType<typeof subscribeToOptionsTicker>['iterator']>>[number]

export function subscribeToOptionsTicker({asset = 'BTC', localDate, frequencyInSeconds = 5}: {
    asset?: string,
    localDate: Date,
    frequencyInSeconds?: number
}) {
    const year = localDate.getFullYear();
    const month = localDate.getMonth() + 1
    const day = localDate.getDate()
    const {iterator, stoppable} = subscribeToBinanceUpdates<any[]>((callback) =>
            nativeBinanceSetup(`${asset}@ticker@${year % 100}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`, callback),
        frequencyInSeconds
    )
    return {
        iterator: async function* () {
            for await (const item of iterator) {
                yield item.map((element) => {
                    const split = element["s"].split('-')

                    return {
                        type: split[3] as 'C' | 'P',
                        strikePrice: parseFloat(split[2]),
                        eventTime: element["E"] as number, //:1657706425200,          // event time
                        transactionTime: element["T"] as number, //:1657706425220,          // transaction time
                        option: element["s"] as `${string}-${number}-${number}-${'C' | 'P'}`, //:"ETH-220930-1600-C",    // Option symbol
                        openingPrice: element["o"] as number, //:"2000",                 // 24-hour opening price
                        highestPrice: element['h'] as number,// "h":"2020",                 // Highest price
                        lowestPrice: element['l'] as number,// "l":"2000",                 // Lowest price
                        latestPrice: element['c'] as number,// "c":"2020",                 // latest price
                        tradingVolume: element['V'] as number,// "V":"1.42",                 // Trading volume(in contracts)
                        tradeAmount: element["A"] as number,// "A":"2841",                 // trade amount(in quote asset)
                        priceChangePercent: element["P"] as number,// "P":"0.01",                 // price change percent
                        priceChange: element["p"] as number,// "p":"20",                   // price change
                        volumeOfLastTrade: element['Q'] as number,// "Q":"0.01",                 // volume of last completed trade(in contracts)
                        firstTradeID: element['F'] as number, // "F":"27",                   // first trade ID
                        lastTradeID: element['L'] as number, // "L":"48",                   // last trade ID
                        numberOfTrades: element['n'] as number, // "n":22,                     // number of trades
                        bestBuyPrice: element['bo'] as number, // "bo":"2012",                // The best buy price
                        bestCellPrice: parseFloat(element['ao']) as number,// "ao":"2020",                // The best sell price
                        bestBuyQuantity: element['bq'] as number,// "bq":"4.9",                 // The best buy quantity
                        bestCellQuantity: element['aq'] as number,// "aq":"0.03",                // The best sell quantity
                        buyImpliedVolatility: parseFloat(element['b']) as number,// "b":"0.1202",               // BuyImplied volatility
                        sellImpliedVolatility: parseFloat(element['a']) as number,// "a":"0.1318",               // SellImplied volatility
                        delta: parseFloat(element['d']) as number,// "d":"0.98911",              // delta
                        theta: element['t'] as number,// "t":"-0.16961",             // theta
                        gamma: element['g'] as number,// "g":"0.00004",              // gamma
                        vega: element['v'] as number,// "v":"2.66584",              // vega
                        impliedVolatility: parseFloat(element['vo']) as number,// "vo":"0.10001",             // Implied volatility
                        markPrice: parseFloat(element['mp']) as number,// "mp":"2003.5102",           // Mark price
                        buyMaxPrice: element['hl'] as number,// "hl":"2023.511",            // Buy Maximum price
                        sellMinPrice: element['ll'] as number,// "ll":"1983.511",            // Sell Minimum price
                        estimatedStrikePrice: element['eep'] as number// "eep":"0"                   // Estimated strike price (
                    }
                })
            }
        },
        stop: () => stoppable.stop()
    }

}
