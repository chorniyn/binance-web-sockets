import {CronJob} from 'cron';
import {connectToMongo, requestAndStoreSnapshot} from "./requestAndStoreSnapshot";
import {logger} from "./logger";
import {MongoConnection} from "./MongoConnection";
import {Command} from "commander";

const program = new Command();

program
    .option("-h, --mongoHost <type>", "Mongo Host", "localhost")
    .option("-p, --mongoPort <type>", "Mongo Port", "27017")
    .option("-d, --database <type>", "Mongo database name", "binance-options")
    .option("-c, --cron <type>", "CRON expression to request data", "55 * * * *")
    .option("-a --assets <type>", "Assets to fetch", "BTC,ETH")

program.parse(process.argv);

const options = program.opts();
const mongoConnection: MongoConnection = {
    host: options.mongoHost,
    port: parseInt(options.mongoPort),
    database: options.database
}

const assets = (options.assets as string).split(',').map((x) => x.trim())
export function start(
    /**
     * default is 55th minute of every hour
     */
    cronExpression: string = options.cron
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
