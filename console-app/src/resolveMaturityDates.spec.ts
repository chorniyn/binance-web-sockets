import {describe, expect, it} from "vitest";
import {resolveMaturityDates} from "./requestAndStoreSnapshot";
import {dateToLocalString} from "./date-utils";

describe("resolveMaturityDates", () => {
    it("should pass for December 1, 2024, 7:50:34 UTC, Sunday", () => {
        assertResult(1733039434000, [
            //3 daily
            '2024-12-01',
            '2024-12-02',
            '2024-12-03',

            //4 weekly
            '2024-12-06',
            '2024-12-13',
            '2024-12-20',
            '2024-12-27',

            //4 monthly
            '2024-12-27',
            '2025-01-31',
            '2025-02-28',
            '2025-03-28',

            //4 quarterly
            '2024-12-27',
            '2025-03-28',
            '2025-06-27',
            '2025-09-26'
        ])
    })

    it("should pass for 1 December 2024., 7:59:02 UTC", () => {
        assertResult(1733039942000, [
            //3 daily
            '2024-12-02',
            '2024-12-03',
            '2024-12-04',

            //4 weekly
            '2024-12-06',
            '2024-12-13',
            '2024-12-20',
            '2024-12-27',

            //4 monthly
            '2024-12-27',
            '2025-01-31',
            '2025-02-28',
            '2025-03-28',

            //4 quarterly
            '2024-12-27',
            '2025-03-28',
            '2025-06-27',
            '2025-09-26'
        ])
    })

    it("should pass for Friday, 31 January 2025., 7:58:59 UTC", () => {
        assertResult(1738310339000, [
            //3 daily
            '2025-01-31',
            '2025-02-01',
            '2025-02-02',

            //4 weekly skipping today's Friday
            '2025-02-07',
            '2025-02-14',
            '2025-02-21',
            '2025-02-28',

            //4 monthly skipping today's Friday
            '2025-02-28',
            '2025-03-28',
            '2025-04-25',
            '2025-05-30',

            //4 quarterly
            '2025-03-28',
            '2025-06-27',
            '2025-09-26',
            '2025-12-26'
        ])
    })

    it("should pass for Friday, 31 January 2025, 9:58:59 UTC", () => {
        assertResult(1738317539000, [
            //3 daily
            '2025-02-01',
            '2025-02-02',
            '2025-02-03',

            //4 weekly skipping today's Friday
            '2025-02-07',
            '2025-02-14',
            '2025-02-21',
            '2025-02-28',

            //4 monthly skipping today's Friday
            '2025-02-28',
            '2025-03-28',
            '2025-04-25',
            '2025-05-30',

            //4 quarterly
            '2025-03-28',
            '2025-06-27',
            '2025-09-26',
            '2025-12-26'
        ])
    })

    it("should pass for Friday, 27 December 2024, 8:58:59 UTC", () => {
        assertResult(1735286339000, [
            //3 daily
            '2024-12-27',
            '2024-12-28',
            '2024-12-29',

            //4 weekly skipping today's Friday
            '2025-01-03',
            '2025-01-10',
            '2025-01-17',
            '2025-01-24',

            //4 monthly skipping today's Friday
            '2025-01-31',
            '2025-02-28',
            '2025-03-28',
            '2025-04-25',

            //4 quarterly skipping today's Friday
            '2025-03-28',
            '2025-06-27',
            '2025-09-26',
            '2025-12-26'
        ])
    })

    function assertResult(epochMillis: number, expected: string[]) {
        const result = resolveMaturityDates(epochMillis)
        expect(result.map(date => dateToLocalString(date)).sort()).toStrictEqual(Array.from(new Set(expected)).sort())
    }
})
