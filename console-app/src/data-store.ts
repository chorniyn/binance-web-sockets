import {OptionTickerItem, TradeIndexItem} from "./DomainModel";
import {OrderBook} from "./OrderBook";
import {Trade} from "./Trade";

export interface DataStore<Connection> {
    storeTrades(tradesToStore: Array<Trade>, dataStoreConnectionPromise: Promise<any>): Promise<void>;
    randomId: () => string
    storeTradeIndex(item: TradeIndexItem, connection: Promise<Connection>): Promise<void>;
    storeOrderBook(item: OrderBook, connection: Promise<Connection>): Promise<void>;
    storeOptions24hTicker(request: {asset: string, maturityDate: string, data: OptionTickerItem[]}, connection: Promise<Connection>): Promise<void>
    connect(): Promise<Connection>
    disconnect(connection: Connection): Promise<void>
}
