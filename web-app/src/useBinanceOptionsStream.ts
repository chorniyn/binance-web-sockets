import {useEffect, useMemo, useState} from "react";
import ReconnectingWebSocket from "reconnecting-websocket";

export interface OptionRow {
    strikePrice: number
    call?: OptionTickerItem
    put?: OptionTickerItem
}
interface MaturityDateData {
    maturityDate: Date,
    optionsData: OptionRow[]
}
interface OptionsData {
    indexPrice?: number
    data: MaturityDateData[]
}

function areDatesEqual(date1: Date, date2: Date) {
    return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate()
}

export const useBinanceOptionsStream = () => {
    const maturityDates = useMemo(() => {
        const now = new Date()
        const result: Date[] = []
        Array.from({length: 5}).forEach(() =>{
            result.push(new Date(now))
            now.setDate(now.getDate() + 1)
        })
        return result
    }, [])
    const [options, setOptions] = useState<OptionsData>({data: []})
    useEffect(() => {
        const {iterator, stop} = subscribeToOptions({
            asset: 'BTC',
            localDates: maturityDates,
        });
        (async () => {
            for await (const updates of iterator()) {
                setOptions((prev) => {
                    if (Array.isArray(updates)) {
                        const map = updates.reduce((acc, item) => {
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
                        const sortedByStrikePrice = Array.from(map.values()).sort((a, b) => a.strikePrice - b.strikePrice)

                        const dataForMaturityDateIndex = prev.data.findIndex((item) => areDatesEqual(item.maturityDate, updates[0].maturityDate))
                        if (dataForMaturityDateIndex >= 0) {
                            const data = [...prev.data]
                            data[dataForMaturityDateIndex] = {
                                maturityDate: updates[0].maturityDate,
                                optionsData: sortedByStrikePrice
                            }
                            const x: OptionsData = {
                                ...prev,
                                data
                            }
                            return x
                        } else {
                            const x: OptionsData = {
                                ...prev,
                                data: [...prev.data, {
                                    maturityDate: updates[0].maturityDate,
                                    optionsData: sortedByStrikePrice
                                }].sort((a, b) => a.maturityDate.getTime() - b.maturityDate.getTime())
                            }
                            return x
                        }
                    } else {
                        return {
                            ...prev,
                            indexPrice: updates.price
                        }
                    }

                })
            }
        })()
        return () => {
            stop()
        }
    }, [maturityDates]);
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

export function subscribeToBinanceUpdates<T>(callbackSetup: (callback: (value: T) => void) => Stoppable) {
    const iterable = new AsyncGeneratorFromCallback<T>();
    const stoppable = callbackSetup((value) => iterable.callback(value));
    return {
        iterator: iterable.generate(),
        stoppable: {
            stop: () => {
                stoppable.stop()
                iterable.stop()
            }
        }
    }
}

function nativeBinanceSetup(streams: string[], callback: (value: any[]) => void): Stoppable {
    const binanceWSUrl = 'wss://nbstream.binance.com/eoptions/ws';

    const rws = new ReconnectingWebSocket(`${binanceWSUrl}/${streams.join('/')}`);

    rws.addEventListener('open', () => {
        console.info("WebSocket Opened", streams);
    });

    rws.addEventListener('message', (data) => {
        callback(JSON.parse(data.data));
    });

    rws.addEventListener('error', (error) => {
        console.error('WebSocket Error:', error, streams);
    });
    return {
        stop: () => rws.close()
    }
}

export interface OptionTickerItem  {
    type: 'C' | 'P',
    maturityDate: Date
    strikePrice: number,
    eventTime: number
    transactionTime: number
    option: `${string}-${number}-${number}-${'C' | 'P'}`, //:"ETH-220930-1600-C",    // Option symbol
    openingPrice: number                 // 24-hour opening price
    highestPrice: number//2020",                 // Highest price
    lowestPrice: number// Lowest price
    latestPrice: number,// "c":"2020",                 // latest price
    tradingVolume: number,// "V":"1.42",                 // Trading volume(in contracts)
    tradeAmount: number,// "A":"2841",                 // trade amount(in quote asset)
    priceChangePercent: number,// "P":"0.01",                 // price change percent
    priceChange: number,// "p":"20",                   // price change
    volumeOfLastTrade: number,// "Q":"0.01",                 // volume of last completed trade(in contracts)
    firstTradeID: number, // "F":"27",                   // first trade ID
    lastTradeID: number, // "L":"48",                   // last trade ID
    numberOfTrades: number, // "n":22,                     // number of trades
    bestBuyPrice: number, // "bo":"2012",                // The best buy price
    bestSellPrice: number,// "ao":"2020",                // The best sell price
    bestBuyQuantity: number,// "bq":"4.9",                 // The best buy quantity
    bestCellQuantity: number,// "aq":"0.03",                // The best sell quantity
    buyImpliedVolatility: number,// "b":"0.1202",               // BuyImplied volatility
    sellImpliedVolatility: number,// "a":"0.1318",               // SellImplied volatility
    delta: number,// "d":"0.98911",              // delta
    theta: number,// "t":"-0.16961",             // theta
    gamma: number,// "g":"0.00004",              // gamma
    vega: number,// "v":"2.66584",              // vega
    impliedVolatility: number,// "vo":"0.10001",             // Implied volatility
    markPrice: number,// "mp":"2003.5102",           // Mark price
    buyMaxPrice: number,// "hl":"2023.511",            // Buy Maximum price
    sellMinPrice: number,// "ll":"1983.511",            // Sell Minimum price
    estimatedStrikePrice: number// "eep":"0"                   // Estimated strike price (
}

export interface TradeIndexItem {
    time: number
    price: number
}
const fakeDate = new Date()
export function subscribeToOptions({asset = 'BTC', localDates}: {
    asset?: string,
    localDates: Date[],
}) {
    const streams: string[] = [`${asset}USDT@index`]
    for (const date of localDates) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1
        const day = date.getDate()
        streams.push(`${asset}@ticker@${year % 100}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`)
    }
    const {iterator, stoppable} = subscribeToBinanceUpdates<any[]>((callback) =>
            nativeBinanceSetup(streams, callback),
    )
    return {
        iterator: async function* () {
            for await (const item of iterator) {
                if (Array.isArray(item)) {
                    yield item.map((element, index) => {
                        const split = (element["s"] as string).split('-')
                        let maturityDate: Date = fakeDate
                        if (index === 0) {
                            const dateString = split['1']
                            const year = parseInt(dateString.substring(0, 2)) + 2000
                            const month = parseInt(dateString.substring(2, 4)) - 1
                            const day = parseInt(dateString.substring(4, 6))
                            maturityDate = new Date(year, month, day)
                        }
                        const ticketItem: OptionTickerItem = {
                            maturityDate,
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
                            bestBuyPrice: parseFloat(element['bo']) as number, // "bo":"2012",                // The best buy price
                            bestSellPrice: parseFloat(element['ao']) as number,// "ao":"2020",                // The best sell price
                            bestBuyQuantity: parseFloat(element['bq']) as number,// "bq":"4.9",                 // The best buy quantity
                            bestCellQuantity: parseFloat(element['aq']) as number,// "aq":"0.03",                // The best sell quantity
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
                        return ticketItem
                    })
                } else {
                    const tradeIndexItem: TradeIndexItem = {
                        time: item['E'],
                        price: parseFloat(item['p'])
                    }
                    yield tradeIndexItem
                }
            }
        },
        stop: () => stoppable.stop()
    }

}
