export interface OrderBook {
    //symbol
    s: string
    //time in milliseconds
    t: number
    //bids, flatten array: [PRICE1, QTY1, PRICE2, QTY2]
    b: Array<number>
    //asks, flatten array: [PRICE1, QTY1, PRICE2, QTY2]
    a: Array<number>
}