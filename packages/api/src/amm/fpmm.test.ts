import { describe, expect, it } from "vitest";

import { quoteBuyBinaryFpmm, quotePriceYes } from "./fpmm.js";

describe("binary FPMM", () => {
  it("buys YES and keeps pool balances positive", () => {
    const pool = { yesMicros: 1_000_000n, noMicros: 1_000_000n, feeBps: 100 };
    const result = quoteBuyBinaryFpmm({ pool, outcome: "YES", collateralInMicros: 100_000n });

    expect(result.sharesOutMicros).toBeGreaterThan(0n);
    expect(result.nextPool.yesMicros).toBeGreaterThan(0n);
    expect(result.nextPool.noMicros).toBeGreaterThan(0n);
  });

  it("charges fee and net = in - fee", () => {
    const pool = { yesMicros: 1_000_000n, noMicros: 1_000_000n, feeBps: 100 };
    const result = quoteBuyBinaryFpmm({ pool, outcome: "NO", collateralInMicros: 123_456n });

    expect(result.netCollateralMicros + result.feeMicros).toBe(123_456n);
  });

  it("moves YES price upward when buying YES", () => {
    const pool = { yesMicros: 1_000_000n, noMicros: 1_000_000n, feeBps: 100 };
    const p0 = quotePriceYes(pool);
    const result = quoteBuyBinaryFpmm({ pool, outcome: "YES", collateralInMicros: 200_000n });
    const p1 = quotePriceYes(result.nextPool);
    expect(p1).toBeGreaterThan(p0);
  });
});
