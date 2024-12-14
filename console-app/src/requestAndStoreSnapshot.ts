import {subscribeToOptions} from "./subscribe-to-stream";
import mongoose from 'mongoose';
import {MongoConnection} from "./MongoConnection";
import {logger} from "./logger";
import {optionItemSchema, OptionTickerItem, TradeIndexItem, tradeIndexSchema} from "./DomainModel";
import {
    addDays,
    addWeeks,
    getDay,
    getMonth,
} from "date-fns";
import {toZonedTime} from "date-fns-tz";
import {UTCDate} from "@date-fns/utc";
import {dateToLocalString} from "./date-utils";

function findClosestFriday({since, nowUtc}:{since: Date, nowUtc: Date}) {
    /**
     * 0 is Sunday,
     * 5 is Friday
     * 6 is Saturday
     */
    let result: Date = since
    while (true) {
        if (getDay(result) === 5 && canUseDate({dateUtc: result, nowUtc})) {
            return result
        }
        result = addDays(result, 1)
    }
}

function findClosestLastFridayOfMonth({startingFriday, nowUtc}:{startingFriday: Date, nowUtc: Date}) {
    /**
     * 0 is Sunday,
     * 5 is Friday
     * 6 is Saturday
     */
    let result: Date = startingFriday
    while (true) {
        if (getMonth(result) != getMonth(addWeeks(result, 1)) && canUseDate({dateUtc: result, nowUtc})) {
            return result
        }
        result = addWeeks(result, 1)
    }
}

type EpochMillis = number
function canUseDate({dateUtc, nowUtc}: {dateUtc: Date, nowUtc: Date}) {
    const dateYear = dateUtc.getFullYear()
    const nowYear = nowUtc.getFullYear()
    if (dateYear < nowYear) {
        return false
    } else if (dateYear > nowYear) {
        return true
    }

    const dateMonth = dateUtc.getMonth()
    const nowMonth = nowUtc.getMonth()
    if (dateMonth < nowMonth) {
        return false
    } else if (dateMonth > nowMonth) {
        return true
    }

    const dateDay = dateUtc.getDate()
    const nowDate = nowUtc.getDate()
    return dateDay > nowDate
}

/**
 * Array of maturity dates to request. Format [yyyy-MM-dd]
 */
export function resolveMaturityDates(): Date[] {
    const nowEpochMillis = Date.now()
    const nowUtc = toZonedTime(nowEpochMillis, 'UTC')
    const todayThreshold = UTCDate.UTC(nowUtc.getFullYear(), nowUtc.getMonth(), nowUtc.getDate(), 7, 59, 0, 0)
    const includeToday = nowEpochMillis < todayThreshold;
    const dailyOffset = includeToday ? 0 : 1
    const dailyMaturityDates = [
        addDays(nowUtc, dailyOffset),
        addDays(nowUtc, dailyOffset + 1),
        addDays(nowUtc, dailyOffset + 2)
    ]

    const closestFriday = findClosestFriday({since: nowUtc, nowUtc});

    const weeklyMaturityDates = [
       closestFriday,
       addWeeks(closestFriday, 1),
       addWeeks(closestFriday, 2),
       addWeeks(closestFriday, 3),
    ]

    const closestFridayOfMonth = findClosestLastFridayOfMonth({startingFriday: closestFriday, nowUtc});
    const monthlyMaturityDates = [
        closestFridayOfMonth,
    ]
    while (monthlyMaturityDates.length <= 3) {
        monthlyMaturityDates.push(
            findClosestLastFridayOfMonth({
                startingFriday: addWeeks(monthlyMaturityDates[monthlyMaturityDates.length - 1], 1), nowUtc
            }))
    }
    const quarterlyMaturityDates: Date[] = [
    ]
    let year = nowUtc.getFullYear()
    let month = 2;
    while (quarterlyMaturityDates.length <= 4) {
        const startOfQuarter = toZonedTime(UTCDate.UTC(year, month, 1, 0, 0, 0, 0), 'UTC')
        const closestFriday = findClosestFriday({since: startOfQuarter, nowUtc})
        const closestLastFridayOfMonth = findClosestLastFridayOfMonth({startingFriday: closestFriday, nowUtc})
        if (canUseDate({dateUtc: closestLastFridayOfMonth, nowUtc})) {
            quarterlyMaturityDates.push(closestLastFridayOfMonth)
            year = closestLastFridayOfMonth.getFullYear()
            month = closestLastFridayOfMonth.getMonth()
        }

        if (month === 11) {
            month = 2
            ++year
        } else {
            month += 3
        }
    }
    const resultSet = new Set<string>()
    return [
        ...dailyMaturityDates,
        ...weeklyMaturityDates,
        ...monthlyMaturityDates,
        ...quarterlyMaturityDates
    ].sort((a, b) => a.getTime() - b.getTime())
        .reduce((acc, date) => {
        const dateStr = date.toDateString()
        if (!resultSet.has(date.toDateString())) {
            acc.push(date)
            resultSet.add(dateStr)
        }
        return acc
    }, [] as Date[])
}

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

export async function requestAndStoreSnapshot({mongoConnection, assets}: { mongoConnection: MongoConnection, assets: string[] }) {

    const maturityDates = resolveMaturityDates()
    const maturityDatesStrings = maturityDates.map((m) => dateToLocalString(m))
    const mongoConnectionPromise = connectToMongo(mongoConnection)
    try {
        const OptionItem = mongoConnectionPromise
            .then((x) => x.model<OptionTickerItem>('OptionTicketItem', optionItemSchema));
        const TradeIndex = mongoConnectionPromise
            .then((x) => x.model<TradeIndexItem>('TradeIndex', tradeIndexSchema));
        const promiseResults = await Promise.allSettled(assets.map(async (asset) => {
            logger.info("Fetching data for asset", {asset, maturityDates: maturityDates.map((m) => m.toDateString())})
            const {iterator, stop} = subscribeToOptions({
                asset,
                maturityDates
            })
            let isDone = false
            const timeoutHandle = setTimeout(() => {
                isDone = true
                stop()
            }, 40_000)
            const maturityDatesReceived = new Set<string>()
            let indexPriceSaved = false
            try {
                for await (const item of iterator()) {
                    if (Array.isArray(item)) {
                        if (item.length) {
                            const maturityDate = item[0].maturityDate
                            if (maturityDatesReceived.has(maturityDate)) {
                                continue
                            }
                            maturityDatesReceived.add(maturityDate)
                            logger.info("Storing options 24h ticker", {asset, maturityDate})
                            const result = await (await OptionItem).bulkWrite(item.map((option) => ({
                                insertOne: {
                                    document: option
                                }
                            })));
                            if (result.hasWriteErrors()) {
                                logger.error("Batch write errors", {errors: result.getWriteErrors(), asset})
                                throw Error("Error writing Option Ticker to mongo")
                            }
                        }
                    } else if (!indexPriceSaved) {
                        indexPriceSaved = true
                        logger.info("Storing trade index", {asset})
                        await (await TradeIndex).create(item)
                    }
                    if (isDone || (indexPriceSaved && maturityDatesReceived.size === maturityDatesStrings.length)) {
                        break
                    }
                }
            } finally {
                stop()
                clearTimeout(timeoutHandle)
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
