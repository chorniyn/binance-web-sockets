import mongoose, {Types} from "mongoose";
import {MongoConnection} from "./MongoConnection";
import {logger} from "./logger";
import {DataStore} from "./data-store";
import {OptionTickerItem, TradeIndexItem} from "./DomainModel";
import {ObjectId} from "mongodb";
import {optionItemSchema, tradeIndexSchema} from "./MongoDomainModel";

interface MongoConnectionInstance {
    mongo: typeof mongoose
    optionItem: mongoose.Model<OptionTickerItem>
    tradeIndex: mongoose.Model<TradeIndexItem>
}
export class MongoDataStore implements DataStore<MongoConnectionInstance>{
    constructor(private mongoConnection: MongoConnection) {}

    randomId = () => new ObjectId().toString()

    async storeTradeIndex(item: TradeIndexItem, connection: Promise<MongoConnectionInstance>): Promise<void> {
        const c = await connection
        await (c.tradeIndex).create(item)
    }

    async storeOptions24hTicker( {data, asset, maturityDate}: {asset: string, maturityDate: string, data: OptionTickerItem[]}, connection: Promise<MongoConnectionInstance>): Promise<void> {
        const c = await connection
        const result = await (c.optionItem).bulkWrite(data.map((option) => ({
            insertOne: {
                document: option
            }
        })));
        if (result.hasWriteErrors()) {
            logger.error("Batch write errors", {errors: result.getWriteErrors(), asset})
            throw Error("Error writing Option Ticker to mongo")
        }
    }

    disconnect(connection:MongoConnectionInstance): Promise<void> {
        return connection.mongo.disconnect()
    }
    connect(): Promise<MongoConnectionInstance> {
        return connectToMongo(this.mongoConnection)
    }

}

export const connectToMongo = async (mongoConnection: MongoConnection): Promise<MongoConnectionInstance> => {
    logger.info('Connecting to MongoDB');
    const connection = await mongoose.connect(`mongodb://${mongoConnection.host}:${mongoConnection.port}/${mongoConnection.database}`, {
        appName: 'binance-options-scraper',
        connectTimeoutMS: 3000,
        socketTimeoutMS: 5000,
        serverSelectionTimeoutMS: 3000
    });
    logger.info('MongoDB connected');
    return {
        mongo: connection,
        optionItem: connection.model<OptionTickerItem>('OptionTicketItem', optionItemSchema),
        tradeIndex: connection.model<TradeIndexItem>('TradeIndex', tradeIndexSchema)
    }
};
