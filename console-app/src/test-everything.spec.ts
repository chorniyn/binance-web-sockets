import {describe, it} from "vitest";
import {resolveMaturityDates} from "./requestAndStoreSnapshot";

describe("Test", () => {
  it("should pass", () => {
    console.log(resolveMaturityDates().map(date => date.toDateString()))
  })
})
