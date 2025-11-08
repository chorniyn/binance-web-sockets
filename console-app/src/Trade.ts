export interface Trade {
    //symbol
    s: string
    //trade id
    i: number
    //price
    p: number
    //qty
    q: number
    //quoteQty
    u: number
    //isBuyerMaker
    r: boolean
    //isBestMatch
    m: boolean
    //time
    t: number
}