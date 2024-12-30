import {OptionTickerItem, TradeIndexItem} from "./DomainModel";

export interface DataStore<Connection> {
    randomId: () => string
    storeTradeIndex(item: TradeIndexItem, connection: Promise<Connection>): Promise<void>;
    storeOptions24hTicker(request: {asset: string, maturityDate: string, data: OptionTickerItem[]}, connection: Promise<Connection>): Promise<void>
    connect(): Promise<Connection>
    disconnect(connection: Connection): Promise<void>
}
