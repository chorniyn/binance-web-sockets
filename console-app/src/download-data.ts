import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, ScanCommand, ScanCommandInput} from "@aws-sdk/lib-dynamodb";
import path from "node:path";
import * as fs from "node:fs";
import {format} from "fast-csv";
import {Command} from "commander";

interface Options {
    accessKeyId: string,
    secretAccessKey: string,
}

const program = new Command();

program
    .option("-k, --accessKeyId <string>", "AWS Key ID", "")
    .option("-s, --secretAccessKey <string>", "AWS Secret Key", "")

program.parse(process.argv);

const options = program.opts<Options>();

const client = DynamoDBDocumentClient.from(new DynamoDBClient({
    region: "eu-west-2",
    credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey
    }
}))

const attributeMapping: Record<string,  string> = {
    id: "id",
    tr: "tradingPair",
    //Call or put
    tp: 'type',
    //yyyy-MM-dd
    m: "maturityDate", 
    s: "strikePrice", 
    E: "eventTime", 
    T: "transactionTime", 
    o: "openingPrice",                  // 24-hour opening price
    h: "highestPrice", 
    l: "lowestPrice",  // Lowest price
    c: "latestPrice",// "c":"2020"",                  // latest price
    V: "tradingVolume",// "V":"1.42"",                  // Trading volume(in contracts)
    A: "tradeAmount",// "A":"2841"",                  // trade amount(in quote asset)
    P: "priceChangePercent",// "P":"0.01"",                  // price change percent
    p: "priceChange",// "p":"20"",                    // price change
    Q: "volumeOfLastTrade",// "Q":"0.01"",                  // volume of last completed trade(in contracts)
    F: "firstTradeID", // "F":"27"",                    // first trade ID
    L: "lastTradeID", // "L":"48"",                    // last trade ID
    n: "numberOfTrades", // "n":22",                      // number of trades
    bo: "bestBuyPrice", // "bo":"2012"",                 // The best buy price
    ao: "bestSellPrice",// "ao":"2020"",                 // The best sell price
    bq: "bestBuyQuantity",// "bq":"4.9"",                  // The best buy quantity
    aq: "bestCellQuantity",// "aq":"0.03"",                 // The best sell quantity
    b: "buyImpliedVolatility",// "b":"0.1202"",                // BuyImplied volatility
    a: "sellImpliedVolatility",// "a":"0.1318"",                // SellImplied volatility
    d: "delta",               // delta
    t: "theta",// "t":"-0.16961"",              // theta
    g: "gamma",// "g":"0.00004"",               // gamma
    v: "vega",// "v":"2.66584"",               // vega
    vo: "impliedVolatility",// "vo":"0.10001"",              // Implied volatility
    mp: "markPrice",// "mp":"2003.5102"",            // Mark price
    hl: "buyMaxPrice",// "hl":"2023.511"",             // Buy Maximum price
    ll: "sellMinPrice",// "ll":"1983.511"",             // Sell Minimum price
    eep: "estimatedStrikePrice"// "eep":"0"                   // Estimated strike price (
}


async function exportDynamoDBToCSV(): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const writeStream = fs.createWriteStream(path.join(__dirname, "result.csv"));
        const csvStream = format({
            headers: Object.values(attributeMapping) });

        csvStream.pipe(writeStream).on("finish", resolve).on("error", reject);

        let lastEvaluatedKey: Record<string, any> | undefined = undefined;
        let items = 0;
        let indicator = 0;
        try {
            do {
                const params: ScanCommandInput = {
                    TableName: "binance-options",
                    ExclusiveStartKey: lastEvaluatedKey,
                    Limit: 1000
                };

                const command = new ScanCommand(params);
                const response = await client.send(command);

                if (response.Items) {
                    for (const item of response.Items) {
                        csvStream.write(Object.keys(attributeMapping).map((key) => item[key] ?? null))
                    }
                    items += response.Items.length;
                    indicator = items;
                }
                if (indicator > 50_000) {
                    console.log("Exported " + items + " items");
                    indicator = 0;
                }
                lastEvaluatedKey = response.LastEvaluatedKey;
            } while (lastEvaluatedKey);
        } catch (error) {
            reject(error);
        } finally {
            csvStream.end(() => {
                resolve();
            });
        }
    });
}

exportDynamoDBToCSV().then(() => {
    console.log("Export complete.");
})