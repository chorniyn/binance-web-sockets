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
    bestSellPrice?: number,// "ao":"2020",                // The best sell price
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
