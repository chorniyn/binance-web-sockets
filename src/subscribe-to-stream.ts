import Binance, {Ticker, WSTrade} from 'binance-api-node';
import WebSocket from 'ws';
// Initialize the Binance client
const client = Binance();

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

export function subscribeToBinanceUpdates<T>(callbackSetup: (callback: (value: T) => void) => void,
                                             frequencyInSeconds: number = 5): AsyncIterable<T> {
    const iterable = new AsyncGeneratorFromCallback<T>();
    callbackSetup((value) => iterable.callback(value));
    return new RateLimiter(iterable, frequencyInSeconds * 1000)
}

export const subscribeToTrades = ({pairs = ['BTCUSDT'], frequencyInSeconds = 5}: {
    pairs?: string | string[],
    frequencyInSeconds?: number
} = {}) =>
    subscribeToBinanceUpdates<WSTrade>((callback) => client.ws.trades(pairs, callback), frequencyInSeconds)


export const subscribeToFuturesTicker = ({pairs = ['BTCUSDT'], frequencyInSeconds = 5}: {
    pairs?: string | string[],
    frequencyInSeconds?: number
} = {}) =>
    subscribeToBinanceUpdates<Ticker>((callback) => client.ws.futuresTicker(pairs, callback), frequencyInSeconds)

function nativeBinanceSetup(stream: string, callback: (value: any[]) => void) {
    const binanceWSUrl = 'wss://nbstream.binance.com/eoptions/ws';

    const ws = new WebSocket(`${binanceWSUrl}/${stream}`);

    ws.on('open', () => {
        console.info("WebSocket Opened", stream);
    });

    ws.on('message', (data: WebSocket.Data) => {
        callback(JSON.parse(data.toString()));
    });

    ws.on('error', (error: Error) => {
        console.error('WebSocket Error:', error, stream);
    });
}

export async function * subscribeToOptionsTicker({asset = 'BTC', localDate, frequencyInSeconds = 5}: {
    asset?: string,
    localDate: Date,
    frequencyInSeconds?: number
}) {
    const year = localDate.getFullYear();
    const month = localDate.getMonth() + 1
    const day = localDate.getDate()
    const result = subscribeToBinanceUpdates<any[]>((callback) =>
            nativeBinanceSetup(`${asset}@ticker@${year % 100}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`, callback),
        frequencyInSeconds
    )
    for await (const item of result) {
        for (const element of item) {
            yield {
                type: element.e, //:"24hrTicker",           // event type
                eventTime: element["E"], //:1657706425200,          // event time
                transactionTime: element["T"], //:1657706425220,          // transaction time
                option: element["s"], //:"ETH-220930-1600-C",    // Option symbol
                openingPrice: element["o"], //:"2000",                 // 24-hour opening price
                highestPrice: element['h'],// "h":"2020",                 // Highest price
                lowestPrice: element['l'],// "l":"2000",                 // Lowest price
                latestPrice: element['c'],// "c":"2020",                 // latest price
                tradingVolume: element['V'],// "V":"1.42",                 // Trading volume(in contracts)
                tradeAmount: element["A"],// "A":"2841",                 // trade amount(in quote asset)
                priceChangePercent: element["P"],// "P":"0.01",                 // price change percent
                priceChange: element["p"],// "p":"20",                   // price change
                volumeOfLastTrade: element['Q'],// "Q":"0.01",                 // volume of last completed trade(in contracts)
                firstTradeID: element['F'], // "F":"27",                   // first trade ID
                lastTradeID: element['L'], // "L":"48",                   // last trade ID
                numberOfTrades: element['n'], // "n":22,                     // number of trades
                bestBuyPrice: element['bo'], // "bo":"2012",                // The best buy price
                bestCellPrice: element['ao'],// "ao":"2020",                // The best sell price
                bestBuyQuantity: element['bq'],// "bq":"4.9",                 // The best buy quantity
                bestCellQuantity: element['aq'],// "aq":"0.03",                // The best sell quantity
                buyImpliedVolatility: element['b'],// "b":"0.1202",               // BuyImplied volatility
                sellImpliedVolatility: element['a'],// "a":"0.1318",               // SellImplied volatility
                delta: element['d'],// "d":"0.98911",              // delta
                theta: element['t'],// "t":"-0.16961",             // theta
                gamma: element['g'],// "g":"0.00004",              // gamma
                vega: element['v'],// "v":"2.66584",              // vega
                impliedVolatility: element['vo'],// "vo":"0.10001",             // Implied volatility
                markPrice: element['mp'],// "mp":"2003.5102",           // Mark price
                buyMaxPrice: element['hl'],// "hl":"2023.511",            // Buy Maximum price
                sellMinPrice: element['ll'],// "ll":"1983.511",            // Sell Minimum price
                estimatedStrikePrice: element['eep']// "eep":"0"                   // Estimated strike price (
            }
        }
    }
}

export async function * subscribeToOptionsPair({frequencyInSeconds = 5}: {
    frequencyInSeconds?: number
}) {
    const result = subscribeToBinanceUpdates<any[]>((callback) =>
            nativeBinanceSetup('option_pair', callback),
        frequencyInSeconds
    )
    for await (const item of result) {
        for (const element of item) {
            yield element
        }
    }
}
