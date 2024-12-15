import {CronJob} from 'cron';
import {connectToMongo, requestAndStoreSnapshot} from "./requestAndStoreSnapshot";
import {logger} from "./logger";
import {MongoConnection} from "./MongoConnection";
import {programOptions} from "./program-args";


const mongoConnection: MongoConnection = {
    host: programOptions.mongoHost,
    port: parseInt(programOptions.mongoPort),
    database: programOptions.database
}

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
            requestAndStoreSnapshot({mongoConnection, assets}).then(() => {
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
const job = start();

(async () => {
    try {
        const connection = await connectToMongo(mongoConnection)
        await connection.disconnect()
    } catch (e) {
        logger.error("Failed to connect to mongo", {error: e})
        job.stop()
        process.exit(1)
    }
})()
