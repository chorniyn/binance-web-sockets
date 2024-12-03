import {describe, it} from "vitest";
import {subscribeToTrades} from "./subscribe-to-stream";

function prettyPrint(object: object) {
    const transformed = Object.entries(object).reduce((acc, [key, value]) => {
        if (key.toLowerCase().includes("time")) {
            return {...acc, [key]: new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        }
        return {...acc, [key]: value}
    }, {} as any)
    console.log(JSON.stringify(transformed, null, 2));
}

describe("Binance Websockets", () => {
    it("should subscribe to data", async () => {
        for await (const trade of subscribeToTrades()) {
            prettyPrint(trade);
        }
    }, 60_000);
})
