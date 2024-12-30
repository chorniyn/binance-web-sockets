import {Command} from "commander";

interface Options {
    mongoHost: string,
    mongoPort: string,
    database: string,
    cron: string,
    assets: string,
    logPath: string
}

let options: Options

export function programOptions(): Options {
    if (options) {
        return options
    }
    const program = new Command();

    program
        .option("-h, --mongoHost <string>", "Mongo Host", "localhost")
        .option("-p, --mongoPort <number>", "Mongo Port", "27017")
        .option("-d, --database <string>", "Mongo database name", "binance-options")
        .option("-c, --cron <string>", "CRON expression to request data", "55 * * * *")
        .option("-a --assets <string, comma separated>", "Assets to fetch", "BTC,ETH")
        .option("-l --logPath <string>", "Log folder", "")

    program.parse(process.argv);

    options = program.opts<Options>();
    return options
}
