/**
 * Payment conversion utilities
 * 
 * Monad (MON) uses 18 decimals (wei)
 * Coin uses 6 decimals (micros)
 * 
 * Fixed conversion rate: 1 MON = 100 Coin
 * 
 * All calculations use integer arithmetic only (no floating point)
 */

const MONAD_DECIMALS = 18;
const COIN_DECIMALS = 6;
const RATE_NUMERATOR = 100n;  // 1 MON = 100 Coin

// Conversion factor: 10^(MONAD_DECIMALS - COIN_DECIMALS) = 10^12
const DECIMAL_DIFF = BigInt(MONAD_DECIMALS - COIN_DECIMALS);
const CONVERSION_FACTOR = 10n ** DECIMAL_DIFF;

/**
 * Convert MON (wei) to Coin (micros)
 * Formula: coinMicros = (monWei * 100) / 10^12
 * 
 * Example: 1 MON (10^18 wei) = 100 Coin (10^8 micros)
 */
export function monToCoin(monWei: bigint): bigint {
  if (monWei < 0n) {
    throw new Error("monWei must be non-negative");
  }
  return (monWei * RATE_NUMERATOR) / CONVERSION_FACTOR;
}

/**
 * Convert Coin (micros) to MON (wei)
 * Formula: monWei = (coinMicros * 10^12) / 100
 * 
 * Example: 100 Coin (10^8 micros) = 1 MON (10^18 wei)
 */
export function coinToMon(coinMicros: bigint): bigint {
  if (coinMicros < 0n) {
    throw new Error("coinMicros must be non-negative");
  }
  return (coinMicros * CONVERSION_FACTOR) / RATE_NUMERATOR;
}

/**
 * Format wei amount to human-readable MON string
 */
export function formatMon(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const fraction = wei % 10n ** 18n;
  const fractionStr = fraction.toString().padStart(18, "0").slice(0, 6);
  return `${whole}.${fractionStr}`;
}

/**
 * Parse MON string to wei
 * Example: "1.5" -> 1500000000000000000n
 */
export function parseMon(monStr: string): bigint {
  const [whole = "0", fraction = ""] = monStr.split(".");
  const wholeWei = BigInt(whole) * 10n ** 18n;
  const fractionWei = BigInt(fraction.padEnd(18, "0").slice(0, 18));
  return wholeWei + fractionWei;
}
