import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatAmountMinor, formatUsdtAmount } from './format';

describe('home money formatting', () => {
  it('formats server INR paise without applying the exchange rate again', () => {
    // 2,000 USDT × ₹100 = ₹200,000 → 20,000,000 paise from the API.
    assert.equal(formatAmountMinor(20_000_000, 'INR'), '2,00,000.00 ₹');
    assert.equal(formatAmountMinor(10_000, 'INR'), '100.00 ₹');
    assert.equal(formatAmountMinor(100_000, 'INR'), '1,000.00 ₹');
    assert.equal(formatAmountMinor(1_000_000, 'INR'), '10,000.00 ₹');
    assert.equal(formatAmountMinor(100_000_000, 'INR'), '10,00,000.00 ₹');
    assert.equal(formatAmountMinor(5_000, 'INR'), '50.00 ₹');
    assert.equal(formatAmountMinor(12_500, 'INR'), '125.00 ₹');
    assert.equal(formatAmountMinor(1_005_000, 'INR'), '10,050.00 ₹');
  });

  it('formats the USDT balance as major units', () => {
    assert.equal(formatUsdtAmount(2_000, 'USDT'), 'USDT 2,000.00');
    assert.equal(formatUsdtAmount(0.5, 'USDT'), 'USDT 0.50');
    assert.equal(formatUsdtAmount(1.25, 'USDT'), 'USDT 1.25');
    assert.equal(formatUsdtAmount(100.5, 'USDT'), 'USDT 100.50');
  });
});
