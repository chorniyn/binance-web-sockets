import WebSocket from 'ws';
import {logger} from "./logger";
import {ObjectId} from "mongodb";
import {OptionTickerItem, TradeIndexItem} from "./DomainModel";

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

    const ws = new WebSocket(`${binanceWSUrl}/${streams.join('/')}`);

    ws.on('open', () => {
        logger.info("WebSocket Opened", {streams});
    });

    ws.on('message', (data: WebSocket.Data) => {
        callback(JSON.parse(data.toString()));
    });

    ws.on('error', (error: Error) => {
        logger.error('WebSocket Error', {error, streams});
    });
    ws.on('close', (code) => {
        logger.info('WebSocket Closed', {code, streams});
    })
    return {
        stop: () => ws.close()
    }
}



function parseOptionalFloat(value: string | undefined): number | undefined {
    if (value === undefined) return undefined;
    return parseFloat(value);
}
export function subscribeToOptions({asset = 'BTC', maturityDates}: {
    asset?: string,
    maturityDates: Date[],
}) {
    const streams: string[] = [`${asset}USDT@index`]
    for (const date of maturityDates) {
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
                        const dateString = split[1]
                        const asset = split[0]
                        const year = parseInt(dateString.substring(0, 2)) + 2000
                        const month = parseInt(dateString.substring(2, 4))
                        const day = parseInt(dateString.substring(4, 6))
                        const maturityDate = year.toString() + '-' + month.toString().padStart(2, '0') + '-' + day.toString().padStart(2, '0')
                        const ticketItem: OptionTickerItem = {
                            _id: new ObjectId().toString(),
                            tradingPair: asset + '-USDT',
                            maturityDate,
                            type: (split[3] as 'C' | 'P') === 'C' ? 'Call' : 'Put',
                            strikePrice: parseFloat(split[2]),
                            eventTime: parseInt(element["E"]), //:1657706425200,          // event time
                            transactionTime: parseInt(element["T"]), //:1657706425220,          // transaction time
                            openingPrice: parseOptionalFloat(element["o"]), //:"2000",                 // 24-hour opening price
                            highestPrice: parseOptionalFloat(element['h']),// "h":"2020",                 // Highest price
                            lowestPrice: parseOptionalFloat(element['l']),// "l":"2000",                 // Lowest price
                            latestPrice: parseOptionalFloat(element['c']),// "c":"2020",                 // latest price
                            tradingVolume: parseOptionalFloat(element['V']),// "V":"1.42",                 // Trading volume(in contracts)
                            tradeAmount: parseOptionalFloat(element["A"]),// "A":"2841",                 // trade amount(in quote asset)
                            priceChangePercent: parseOptionalFloat(element["P"]),// "P":"0.01",                 // price change percent
                            priceChange: parseOptionalFloat(element["p"]),// "p":"20",                   // price change
                            volumeOfLastTrade: parseOptionalFloat(element['Q']),// "Q":"0.01",                 // volume of last completed trade(in contracts)
                            firstTradeID: element['F'], // "F":"27",                   // first trade ID
                            lastTradeID: element['L'], // "L":"48",                   // last trade ID
                            numberOfTrades: parseOptionalFloat(element['n']), // "n":22,                     // number of trades
                            bestBuyPrice: parseOptionalFloat(element['bo']), // "bo":"2012",                // The best buy price
                            bestCellPrice: parseOptionalFloat(element['ao']),// "ao":"2020",                // The best sell price
                            bestBuyQuantity: parseOptionalFloat(element['bq']),// "bq":"4.9",                 // The best buy quantity
                            bestCellQuantity: parseOptionalFloat(element['aq']),// "aq":"0.03",                // The best sell quantity
                            buyImpliedVolatility: parseOptionalFloat(element['b']),// "b":"0.1202",               // BuyImplied volatility
                            sellImpliedVolatility: parseOptionalFloat(element['a']),// "a":"0.1318",               // SellImplied volatility
                            delta: parseOptionalFloat(element['d']),// "d":"0.98911",              // delta
                            theta: parseOptionalFloat(element['t']),// "t":"-0.16961",             // theta
                            gamma: parseOptionalFloat(element['g']),// "g":"0.00004",              // gamma
                            vega: parseOptionalFloat(element['v']),// "v":"2.66584",              // vega
                            impliedVolatility: parseOptionalFloat(element['vo']),// "vo":"0.10001",             // Implied volatility
                            markPrice: parseOptionalFloat(element['mp']),// "mp":"2003.5102",           // Mark price
                            buyMaxPrice: parseOptionalFloat(element['hl']),// "hl":"2023.511",            // Buy Maximum price
                            sellMinPrice: parseOptionalFloat(element['ll']),// "ll":"1983.511",            // Sell Minimum price
                            estimatedStrikePrice: parseOptionalFloat(element['eep'])// "eep":"0"                   // Estimated strike price (
                        }
                        return ticketItem
                    })
                } else {
                    const tradeIndexItem: TradeIndexItem = {
                        _id: new ObjectId().toString(),
                        time: item['E'],
                        tradingPair: asset + '-USDT',
                        price: parseFloat(item['p']),
                    }
                    yield tradeIndexItem
                }
            }
        },
        stop: () => stoppable.stop()
    }

}
