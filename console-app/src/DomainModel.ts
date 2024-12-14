import {Schema} from "mongoose";

export interface OptionTickerItem  {
    _id: string
    tradingPair: string,
    type: 'Call' | 'Put',
    //yyyy-MM-dd
    maturityDate: string
    strikePrice: number,
    eventTime: number
    transactionTime: number
    openingPrice?: number                 // 24-hour opening price
    highestPrice?: number//2020",                 // Highest price
    lowestPrice?: number// Lowest price
    latestPrice?: number,// "c":"2020",                 // latest price
    tradingVolume?: number,// "V":"1.42",                 // Trading volume(in contracts)
    tradeAmount?: number,// "A":"2841",                 // trade amount(in quote asset)
    priceChangePercent?: number,// "P":"0.01",                 // price change percent
    priceChange?: number,// "p":"20",                   // price change
    volumeOfLastTrade?: number,// "Q":"0.01",                 // volume of last completed trade(in contracts)
    firstTradeID?: string, // "F":"27",                   // first trade ID
    lastTradeID?: string, // "L":"48",                   // last trade ID
    numberOfTrades?: number, // "n":22,                     // number of trades
    bestBuyPrice?: number, // "bo":"2012",                // The best buy price
    bestCellPrice?: number,// "ao":"2020",                // The best sell price
    bestBuyQuantity?: number,// "bq":"4.9",                 // The best buy quantity
    bestCellQuantity?: number,// "aq":"0.03",                // The best sell quantity
    buyImpliedVolatility?: number,// "b":"0.1202",               // BuyImplied volatility
    sellImpliedVolatility?: number,// "a":"0.1318",               // SellImplied volatility
    delta?: number,// "d":"0.98911",              // delta
    theta?: number,// "t":"-0.16961",             // theta
    gamma?: number,// "g":"0.00004",              // gamma
    vega?: number,// "v":"2.66584",              // vega
    impliedVolatility?: number,// "vo":"0.10001",             // Implied volatility
    markPrice?: number,// "mp":"2003.5102",           // Mark price
    buyMaxPrice?: number,// "hl":"2023.511",            // Buy Maximum price
    sellMinPrice?: number,// "ll":"1983.511",            // Sell Minimum price
    estimatedStrikePrice?: number// "eep":"0"                   // Estimated strike price (
}

export interface TradeIndexItem {
    _id: string
    time: number
    price: number
    //BTC-USDT
    tradingPair: string
}


export const optionItemSchema = new Schema<OptionTickerItem>({
    _id: {type: String, required: true},
    //Call | Put
    type: {type: String, required: true},
    //BTC-USDT
    tradingPair: {type: String, required: true},
    //yyyy-MM-dd
    maturityDate: {type: String, required: true},
    strikePrice: {type: Number, required: true},
    //epoch millis
    eventTime: {type: Number, required: true},
    //epoch millis
    transactionTime: {type: Number, required: true},
    openingPrice: {type: Number, required: false},
    highestPrice: {type: Number, required: false},
    lowestPrice: {type: Number, required: false},
    latestPrice: {type: Number, required: false},
    tradingVolume: {type: Number, required: false}, // Trading volume(in contracts)
    tradeAmount: {type: Number, required: false}, //  trade amount(in quote asset)
    priceChangePercent: {type: Number, required: false}, // price change percent
    priceChange: {type: Number, required: false}, // price change
    volumeOfLastTrade: {type: Number, required: false}, // volume of last completed trade(in contracts)
    firstTradeID: {type: String, required: false}, // first trade ID
    lastTradeID: {type: String, required: false}, // last trade ID
    numberOfTrades: {type: Number, required: false}, // number of trades
    bestBuyPrice: {type: Number, required: false}, // The best buy price
    bestCellPrice: {type: Number, required: false},                // The best sell price
    bestBuyQuantity: {type: Number, required: false},// The best buy quantity
    bestCellQuantity: {type: Number, required: false},// The best sell quantity
    buyImpliedVolatility: {type: Number, required: false},// BuyImplied volatility
    sellImpliedVolatility: {type: Number, required: false},// SellImplied volatility
    delta: {type: Number, required: false},
    theta: {type: Number, required: false},
    gamma: {type: Number, required: false},
    vega: {type: Number, required: false},
    impliedVolatility: {type: Number, required: false},
    markPrice: {type: Number, required: false},
    buyMaxPrice: {type: Number, required: false},
    sellMinPrice: {type: Number, required: false},
    estimatedStrikePrice: {type: Number, required: false}
}).index({tradingPair: 1, strikePrice: 1}, {
    name: 'tradingPair_strikePrice',
});

export const tradeIndexSchema = new Schema<TradeIndexItem>({
    _id: {type: String, required: true},
    //ETH-USDT
    tradingPair: {type: String, required: true},
    //Call | Put
    price: {type: Number, required: true},
    //yyyy-MM-dd
    time: {type: Number, required: true},
}).index({tradingPair: 1, time: 1}, {name: 'tradingPair_time'});
