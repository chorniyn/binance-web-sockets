import {CronJob} from 'cron';
import {requestAndStoreSnapshot} from "./requestAndStoreSnapshot";
import {logger} from "./logger";
import {MongoConnection} from "./MongoConnection";
import {programOptions as options} from "./program-args";
import {MongoDataStore} from "./mongo-data-store";

const programOptions = options()
const mongoConnection: MongoConnection = {
    host: programOptions.mongoHost,
    port: parseInt(programOptions.mongoPort),
    database: programOptions.database
}
const mongoStore = new MongoDataStore(mongoConnection)
const assets = (programOptions.assets as string).split(',').map((x) => x.trim())
export function start(
    /**
     * default is 55th minute of every hour
     */
    cronExpression: string = programOptions.cron
) {
    let getJob = () => job
    const job = new CronJob(
        cronExpression,
        ()=> {
            logger.info("Fetching the data")
            requestAndStoreSnapshot({dataStore: mongoStore, assets}).then(() => {
                logger.info("Successfully fetched the data", {nextExecutionTime: getJob().nextDate()})
            }, (error) => {
                logger.error("Failed to fetch the data", {error: error, nextExecutionTime: getJob().nextDate()})
            })
        },
        null,
        true,
        'UTC'
    );
    logger.info("Started the app", {nextExecutionTime: job.nextDate()})
    return job
}
//const job = start();
requestAndStoreSnapshot({dataStore: mongoStore, assets});
// (async () => {
//     try {
//         const connection = await mongoStore.connect()
//         await mongoStore.disconnect(connection)
//     } catch (e) {
//         logger.error("Failed to connect to mongo", {error: e})
//         job.stop()
//         process.exit(1)
//     }
// })()
