import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamodbDataStore} from "./dynamodb-data-store";
import {requestAndStoreSnapshot} from "./requestAndStoreSnapshot";
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import middy from '@middy/core';
import {metrics} from "./metrics";
const client = new DynamoDBClient({
    region: "eu-west-2"
})
const dataStore = new DynamodbDataStore(client)
const lambdaHandler = async ()=> {
    await requestAndStoreSnapshot({
        dataStore, assets: ["BTC", "ETH"]
    })
}

export const handler = middy(lambdaHandler).use(
    logMetrics(metrics, { captureColdStartMetric: false })
);