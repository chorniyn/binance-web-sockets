import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamodbDataStore} from "./dynamodb-data-store";
import {requestAndStoreSnapshot} from "./requestAndStoreSnapshot";

const client = new DynamoDBClient({
    region: "eu-west-2"
})
const dataStore = new DynamodbDataStore(client)
export async function handler() {
    await requestAndStoreSnapshot({
        dataStore, assets: ["BTC", "ETH"]
    })
}
