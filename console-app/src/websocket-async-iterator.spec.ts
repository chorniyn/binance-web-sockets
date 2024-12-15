import {describe, expect, it, vi} from "vitest";
import {subscribeToOptions} from "./subscribe-to-stream";
import {toZonedTime} from "date-fns-tz";
import {addDays} from "date-fns";
import WebSocket from "ws";
import {dateToLocalString} from "./date-utils";

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
        const date = addDays(toZonedTime(Date.now(), 'UTC'), 1);
        const expectedDateString = dateToLocalString(date)
        const {iterator, stop} = subscribeToOptions({maturityDates: [date]})
        let index = 0
        for await (const item of iterator()) {
            if (Array.isArray(item)) {
                expect(item.length).toBeTruthy()
                item.forEach((i) => {
                    expect(i.maturityDate).toStrictEqual(expectedDateString)
                    expect(i.tradingPair).toBe("BTC-USDT")
                    expect(typeof i.eventTime).toBe('number')
                    expect(typeof i.transactionTime).toBe('number')
                    expect(typeof i.bestBuyPrice).toBe('number')
                    expect(typeof i.bestBuyQuantity).toBe('number')
                    expect(typeof i.bestCellPrice).toBe('number')
                    expect(typeof i.bestCellQuantity).toBe('number')
                    expect(typeof i.theta).toBe('number')
                    expect(typeof i.gamma).toBe('number')
                    expect(typeof i.vega).toBe('number')
                    expect(typeof i.delta).toBe('number')
                })
            }
            console.log("Received", item)
            if (++index === 2) {
                console.log("Stopping")
                stop()
            }
        }
        expect(closedCall).toHaveBeenCalledOnce()
    }, 10_000)
})
