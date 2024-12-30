import {Schema} from "mongoose";
import {OptionTickerItem, TradeIndexItem} from "./DomainModel";

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
    bestSellPrice: {type: Number, required: false},                // The best sell price
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
