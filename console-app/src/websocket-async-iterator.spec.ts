import {describe, expect, it, vi} from "vitest";
import {subscribeToOptions} from "./subscribe-to-stream";
import {toZonedTime} from "date-fns-tz";
import {addDays} from "date-fns";
import WebSocket from "ws";

const closedCall = vi.fn<WebSocket['close']>()
vi.mock('ws', async (importOriginal) => {
    const ws = (await importOriginal()) as (typeof import("ws"))
    const closeOriginal = ws.WebSocket.prototype.close
    ws.WebSocket.prototype.close = function (this: WebSocket, code?: number, data?: string | Buffer) {
        console.log("Websocket closed")
        closedCall(code, data)
        return closeOriginal.call(this, code, data)
    }
    return ws
})
describe("websocket-async-iterator", () => {
    it('should be possible to stop iteration', async () => {
        const {iterator, stop} = subscribeToOptions({maturityDates: [addDays(toZonedTime(Date.now(), 'UTC'), 1)]})
        let index = 0
        for await (const item of iterator()) {
            console.log("Received", item)
            if (++index === 2) {
                console.log("Stopping")
                stop()
            }
        }
        expect(closedCall).toHaveBeenCalledOnce()
    }, 10_000)
})
