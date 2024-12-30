import {subscribeToOptions} from "./subscribe-to-stream";
import {logger} from "./logger";
import {addDays, addWeeks, getDay, getMonth,} from "date-fns";
import {toZonedTime} from "date-fns-tz";
import {UTCDate} from "@date-fns/utc";
import {dateToLocalString} from "./date-utils";
import {DataStore} from "./data-store";

function findClosestFriday({since, nowUtc}:{since: Date, nowUtc?: Date}) {
    /**
     * 0 is Sunday,
     * 5 is Friday
     * 6 is Saturday
     */
    let result: Date = since
    while (true) {
        if (getDay(result) === 5 && (!nowUtc || canUseDate({dateUtc: result, nowUtc}))) {
            return result
        }
        result = addDays(result, 1)
    }
}

function findClosestLastFridayOfMonth({startingFriday, nowUtc}:{startingFriday: Date, nowUtc?: Date}) {
    /**
     * 0 is Sunday,
     * 5 is Friday
     * 6 is Saturday
     */
    let result: Date = startingFriday
    while (true) {
        if (getMonth(result) != getMonth(addWeeks(result, 1)) && (!nowUtc || canUseDate({dateUtc: result, nowUtc}))) {
            return result
        }
        result = addWeeks(result, 1)
    }
}

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
export function resolveMaturityDates(nowEpochMillis: number = Date.now()): Date[] {
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
        const closestFriday = findClosestFriday({since: startOfQuarter, nowUtc: undefined})
        const closestLastFridayOfMonth = findClosestLastFridayOfMonth({startingFriday: closestFriday, nowUtc: undefined})
        if (canUseDate({dateUtc: closestLastFridayOfMonth, nowUtc})) {
            quarterlyMaturityDates.push(closestLastFridayOfMonth)
            year = closestLastFridayOfMonth.getFullYear()
            month = closestLastFridayOfMonth.getMonth()
            if (quarterlyMaturityDates.length === 4) {
                break
            }
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

export async function requestAndStoreSnapshot<D extends DataStore<any>>({dataStore, assets}: { dataStore: D, assets: string[] }) {

    const maturityDates = resolveMaturityDates()
    const maturityDatesStrings = maturityDates.map((m) => dateToLocalString(m))
    const dataStoreConnectionPromise = dataStore.connect()
    logger.info("Fetching data for assets", {assets, maturityDates: maturityDates.map((m) => m.toDateString())})
    try {
        const promiseResults = await Promise.allSettled(assets.map(async (asset) => {
            const {iterator, stop} = subscribeToOptions({
                asset,
                maturityDates,
                randomId: dataStore.randomId
            })
            let isDone = false
            const timeoutHandle = setTimeout(() => {
                isDone = true
                stop()
            }, 10_000)
            const maturityDatesReceived = new Set<string>()
            let indexPriceSaved = false
            let optionsStored = 0
            let indexPriceStored = 0
            try {
                for await (const item of iterator()) {
                    if (Array.isArray(item)) {
                        if (item.length) {
                            const maturityDate = item[0].maturityDate
                            if (maturityDatesReceived.has(maturityDate)) {
                                continue
                            }
                            maturityDatesReceived.add(maturityDate)
                            await dataStore.storeOptions24hTicker({asset, maturityDate, data: item}, dataStoreConnectionPromise)
                            optionsStored += item.length
                        }
                    } else if (!indexPriceSaved) {
                        indexPriceSaved = true
                        await dataStore.storeTradeIndex(item, dataStoreConnectionPromise)
                        ++indexPriceStored
                    }
                    if (isDone || (indexPriceSaved && maturityDatesReceived.size === maturityDatesStrings.length)) {
                        break
                    }
                }
            } finally {
                logger.info("Res", {asset, options: optionsStored, indexPrice: indexPriceStored})
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
            await dataStore.disconnect(await dataStoreConnectionPromise)
        } catch (ignore) {
        }
    }
}
