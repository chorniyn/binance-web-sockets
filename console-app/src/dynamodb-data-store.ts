import {OptionTickerItem, TradeIndexItem} from "./DomainModel";
import {DataStore} from "./data-store";
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {batchWriteOrFail} from "./batch-write";
import {randomUUID} from "node:crypto";
import {OrderBook} from "./OrderBook";
import {Connection} from "mongoose";
import { Trade } from "./Trade";


export class DynamodbDataStore implements DataStore<{}> {
    randomId() {
        return randomUUID()
    }

    private readonly document: DynamoDBDocumentClient

    constructor(
        private readonly dynamodb: DynamoDBClient
    ) {
        this.document = DynamoDBDocumentClient.from(dynamodb)
    }

    async storeTrades(tradesToStore: Array<Trade>): Promise<void> {
        await batchWriteOrFail({
            items: tradesToStore,
            tableName: "binance-trades",
            operation: "store-trades",
            dynamoDbClient: this.dynamodb
        })
    }

    async storeTradeIndex(item: TradeIndexItem): Promise<void> {
        await this.document.send(new PutCommand({
            TableName: "binance-index-prices",
            Item: {
                price: item.price,
                tradingPair: item.tradingPair,
                transactionTime: item.time
            }
        }))
    }

    async storeOrderBook(item: OrderBook): Promise<void> {
        await this.document.send(new PutCommand({
            TableName: "binance-order-book",
            Item: item
        }))
    }

    async storeOptions24hTicker( {data}: {asset: string, maturityDate: string, data: OptionTickerItem[]}): Promise<void> {
        await batchWriteOrFail({
            items: data.map((item) => {
                return {
                    id: item._id,
                    tr: item.tradingPair,
                    tp: item.type, //'Call' | 'Put',
                    //yyyy-MM-dd
                    m: item.maturityDate,
                    s: item.strikePrice,
                    E: item.eventTime,
                    T: item.transactionTime,
                    o: item.openingPrice,                 // 24-hour opening price
                    h: item.highestPrice,
                    l: item.lowestPrice, // Lowest price
                    c: item.latestPrice,// "c":"2020",                 // latest price
                    V: item.tradingVolume,// "V":"1.42",                 // Trading volume(in contracts)
                    A: item.tradeAmount,// "A":"2841",                 // trade amount(in quote asset)
                    P: item.priceChangePercent,// "P":"0.01",                 // price change percent
                    p: item.priceChange,// "p":"20",                   // price change
                    Q: item.volumeOfLastTrade,// "Q":"0.01",                 // volume of last completed trade(in contracts)
                    F: item.firstTradeID, // "F":"27",                   // first trade ID
                    L: item.lastTradeID, // "L":"48",                   // last trade ID
                    n: item.numberOfTrades, // "n":22,                     // number of trades
                    bo: item.bestBuyPrice, // "bo":"2012",                // The best buy price
                    ao: item.bestSellPrice,// "ao":"2020",                // The best sell price
                    bq: item.bestBuyQuantity,// "bq":"4.9",                 // The best buy quantity
                    aq: item.bestCellQuantity,// "aq":"0.03",                // The best sell quantity
                    b: item.buyImpliedVolatility,// "b":"0.1202",               // BuyImplied volatility
                    a: item.sellImpliedVolatility,// "a":"0.1318",               // SellImplied volatility
                    d: item.delta,// "d":"0.98911",              // delta
                    t: item.theta,// "t":"-0.16961",             // theta
                    g: item.gamma,// "g":"0.00004",              // gamma
                    v: item.vega,// "v":"2.66584",              // vega
                    vo: item.impliedVolatility,// "vo":"0.10001",             // Implied volatility
                    mp: item.markPrice,// "mp":"2003.5102",           // Mark price
                    hl: item.buyMaxPrice,// "hl":"2023.511",            // Buy Maximum price
                    ll: item.sellMinPrice,// "ll":"1983.511",            // Sell Minimum price
                    eep: item.estimatedStrikePrice// "eep":"0"                   // Estimated strike price (
                }
            }),
            tableName: "binance-options",
            operation: "store-options",
            dynamoDbClient: this.dynamodb
        })
    }

    disconnect(): Promise<void> {
        return Promise.resolve()
    }

    connect(): Promise<{ }> {
        return Promise.resolve({})
    }

}
