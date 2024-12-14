import {subscribeToOptions} from "./subscribe-to-stream";
import mongoose from 'mongoose';
import {MongoConnection} from "./MongoConnection";
import {logger} from "./logger";
import {optionItemSchema, OptionTickerItem, TradeIndexItem, tradeIndexSchema} from "./DomainModel";

function resolveMaturityDates(): Array<Date> {
    const now = new Date()
    const utcHours = now.getUTCHours()
    const utcMinutes = now.getUTCMinutes()
    const utcSeconds = now.getUTCSeconds()
    //7:59:00 is the last time we want to include today data
    const eightAmThresholdInSeconds = 8 * 60 * 60 - 60
    const timeInSeconds = utcHours * 3600 + utcMinutes * 60 + utcSeconds
    const includeToday = timeInSeconds < eightAmThresholdInSeconds
    return includeToday ? [now] : []
}

const assets = ['BTC', 'ETH']

export const connectToMongo = async (mongoConnection: MongoConnection) => {
    logger.info('Connecting to MongoDB');
    const connection = await mongoose.connect(`mongodb://${mongoConnection.host}:${mongoConnection.port}/${mongoConnection.database}`, {
        appName: 'binance-options-scraper',
        connectTimeoutMS: 3000,
        socketTimeoutMS: 5000,
        serverSelectionTimeoutMS: 3000
    });
    logger.info('MongoDB connected');
    return connection
};

export async function requestAndStoreSnapshot({mongoConnection}: { mongoConnection: MongoConnection }) {

    const maturityDates = resolveMaturityDates()
    const mongoConnectionPromise = connectToMongo(mongoConnection)
    try {
        const OptionItem = mongoConnectionPromise
            .then((x) => x.model<OptionTickerItem>('OptionTicketItem', optionItemSchema));
        const TradeIndex = mongoConnectionPromise
            .then((x) => x.model<TradeIndexItem>('TradeIndex', tradeIndexSchema));
        logger.info("Fetching data for assets", {assets, maturityDates: maturityDates.map((m) => m.toDateString())})
        const promiseResults = await Promise.allSettled(assets.map(async (asset) => {
            const {iterator, stop} = subscribeToOptions({
                asset,
                maturityDates
            })
            let tickerSaved = false
            let indexPriceSaved = false
            try {
                for await (const item of iterator()) {
                    if (Array.isArray(item)) {
                        if (!tickerSaved && item.length) {
                            const result = await (await OptionItem).bulkWrite(item.map((option) => ({
                                insertOne: {
                                    document: option
                                }
                            })));
                            tickerSaved = true
                            if (result.hasWriteErrors()) {
                                logger.error("Batch write errors", {errors: result.getWriteErrors(), asset})
                                throw Error("Error writing Option Ticker to mongo")
                            }
                        }
                    } else if (!indexPriceSaved) {
                        indexPriceSaved = true
                        await (await TradeIndex).create(item)
                    }
                    if (indexPriceSaved && tickerSaved) {
                        break
                    }
                }
            } finally {
                stop()
            }
        }));
        promiseResults.forEach((result, index) => {
            if (result.status === 'rejected') {
                logger.error('Error processing asset', {error: result.reason, asset: assets[index]})
            }
        })
    } finally {
        try {
            await (await mongoConnectionPromise).disconnect()
        } catch (ignore) {
        }
    }
}
