'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertGasEstimate = require('./helpers/assertGasEstimate');
const assertRevert = require('./helpers/assertRevert');
const BN = require('bn.js');
const RatesProvider = artifacts.require('RatesProvider.sol');

contract('RatesProvider', function (accounts) {
  let provider;

  const now = new Date().getTime() / 1000;
  const CHF = web3.utils.toHex('CHF');
  const ETH = web3.utils.toHex('ETH');
  const BTC = web3.utils.toHex('BTC');
  const USD = web3.utils.toHex('USD');
  const ethToWei = new BN('10').pow(new BN('18'));
  const oneBTCinSatoshi = new BN(10).pow(new BN(8));
  const rateOffset = new BN('10').pow(new BN('18'));
  const aWEICHFSample = '48257890165041';
  const aETHCHFSample = '20722';
  const DEFINE_RATES_ESTIMATE = '78508';

  beforeEach(async function () {
    provider = await RatesProvider.new('Test');
  });

  it('should have a name', async function () {
    const name = await provider.name();
    assert.equal(name, 'Test', 'name');
  });

  it('should have currencies', async function () {
    const expectedCurrencies = [
      'ETH', 'BTC', 'EOS', 'GBP', 'USD', 'CHF', 'EUR', 'CNY', 'JPY', 'CAD', 'AUD',
    ].map((c) => web3.utils.toHex(c).padEnd(66, '0'));

    const currencies = await provider.currencies();
    assert.deepEqual(currencies[0], expectedCurrencies, 'currencies');
    assert.deepEqual(currencies[1].map((d) => d.toString()),
      ['18', '8', '4', '2', '2', '2', '2', '2', '2', '2', '2'],
      'decimals');
    assert.equal(currencies[2].toString(), '10000', 'rateOffset');
  });

  it('should not have rates', async function () {
    const rates = await provider.rates();
    assert.equal(rates[0].toString(), '0', 'updatedAt');
    assert.deepEqual(rates[1].map((d) => d.toString()),
      ['0', '0', '0', '0', '0', '0', '0', '0', '0', '0'],
      'rates');
  });

  it('should convert 10.00 CHF Cent to 0 WEI', async function () {
    const converted = await provider.convert(1000, CHF, ETH);
    assert.equal(converted, '0', '0 WEI');
  });

  it('should convert WEI to CHFCent to 0', async function () {
    const converted = await provider.convert(1000, ETH, CHF);
    assert.equal(converted, '0', '0 CHFCent');
  });

  it('should have 0 rate WEICHFCent', async function () {
    const rateWEICHFCent = await provider.rate(CHF);
    assert.equal(rateWEICHFCent.toString(), '0', 'WEICHFCents');
  });

  it('should let operator define a rate', async function () {
    const tx = await provider.defineRates([0, 0, 0, 0, aWEICHFSample]);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Rate', 'event');
    assert.equal(tx.logs[0].args.currency, CHF.padEnd(66, '0'), 'currency');
    assert.ok(tx.logs[0].args.rate.toString(), aWEICHFSample, 'rate');
  });

  it('should let operator define a rate external', async function () {
    const tx = await provider.defineRatesExternal([0, 0, 0, 0, aWEICHFSample]);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Rate', 'event');
    assert.equal(tx.logs[0].args.currency, CHF.padEnd(66, '0'), 'currency');
    assert.ok(tx.logs[0].args.rate.toString(), aWEICHFSample, 'rate');
  });

  it('should prevent anyone from defining a rate', async function () {
    await assertRevert(
      provider.defineRates([0, 0, 0, 0, aWEICHFSample], { from: accounts[1] }), 'OP01');
  });

  it('should prevent anyone from defining a rate external', async function () {
    await assertRevert(
      provider.defineRatesExternal([0, 0, 0, 0, aWEICHFSample], { from: accounts[1] }), 'OP01');
  });

  it('should prevent operator from defining too many rates external', async function () {
    await assertRevert(
      provider.defineRates([0, 0, 0, 0, aWEICHFSample, 0, 0, 0, 0, 0, 0]), 'RP03');
  });

  it('should prevent operator from defining too many rates external', async function () {
    await assertRevert(
      provider.defineRatesExternal([0, 0, 0, 0, aWEICHFSample, 0, 0, 0, 0, 0, 0]), 'RP03');
  });

  describe('With a rates defined', async function () {
    beforeEach(async function () {
      await provider.defineRates([1, 1, 1, 1, aWEICHFSample, 1, 1, 1, 1]);
    });

    it('should have correct gas estimate for defining rates [ @skip-on-coverage ]', async function () {
      const gas = await provider.defineRates.estimateGas([1, 1, 1, 1, aWEICHFSample, 2, 2, 2, 2]);
      assertGasEstimate(gas, DEFINE_RATES_ESTIMATE, 'gas estimate');
    });

    it('should have an update date', async function () {
      const rates = await provider.rates();
      assert.ok(rates[0] > now, 'updatedAt');
    });

    it('should convert CHF Cent to ETH', async function () {
      const amountWEI = await provider.convert(1000, CHF, ETH);
      assert.equal(amountWEI.toString(),
        new BN(aWEICHFSample).mul(new BN('1000')).div(new BN('10000')).toString(), 'WEICHFCents');
    });

    it('should convert WEI to CHFCent', async function () {
      const amountCHFCent = await provider.convert(ethToWei, ETH, CHF);
      assert.equal(amountCHFCent.toString(),
        new BN(aETHCHFSample).mul(new BN('10000')).toString(), 'CHFCentsWEI');
    });
  });

  it('should let operator define new currencies (more)', async function () {
    const expectedCurrencies = [
      'ETH', 'BTC', 'EOS', 'GBP', 'USD', 'CHF', 'EUR', 'CNY', 'JPY', 'CAD', 'AUD', 'XRP',
    ].map((c) => web3.utils.toHex(c).padEnd(66, '0'));
    const expectedDecimals = ['18', '8', '4', '2', '2', '2', '2', '2', '2', '2', '2', '6'];

    const tx = await provider.defineCurrencies(
      expectedCurrencies, expectedDecimals, '10000');
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1, 'logs');
    assert.equal(tx.logs[0].event, 'Currencies', 'event');
    assert.deepEqual(tx.logs[0].args.currencies, expectedCurrencies, 'currencies');
    assert.deepEqual(tx.logs[0].args.decimals.map((d) => d.toString()),
      expectedDecimals, 'decimals');
  });

  it('should let operator define new currencies (less)', async function () {
    const tx = await provider.defineCurrencies(
      [CHF, BTC, ETH], [2, 8, 18],
      rateOffset);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 12);
    assert.equal(tx.logs[10].event, 'RateOffset', 'event 0');
    assert.equal(tx.logs[10].args.rateOffset.toString(), rateOffset.toString(), 'rateOffset');

    assert.equal(tx.logs[11].event, 'Currencies', 'event 1');
    const expectedCurrencies = [
      'CHF', 'BTC', 'ETH',
    ].map((c) => web3.utils.toHex(c).padEnd(66, '0'));
    assert.deepEqual(tx.logs[11].args.currencies, expectedCurrencies, 'currencies');
    assert.deepEqual(tx.logs[11].args.decimals.map((d) => d.toString()),
      ['2', '8', '18'], 'decimals');
  });

  it('should prevent operator from defining inconsistent decimals', async function () {
    await assertRevert(provider.defineCurrencies(
      [CHF, BTC, ETH], [2, 8],
      rateOffset), 'RP01');
  });

  it('should prevent operator from defining null rateOffset', async function () {
    await assertRevert(provider.defineCurrencies(
      [CHF, BTC, ETH], [2, 8, 18], 0), 'RP02');
  });

  it('should prevent anyone from defining a rate', async function () {
    await assertRevert(provider.defineCurrencies(
      [CHF, BTC, ETH], [2, 8, 18],
      rateOffset, { from: accounts[1] }), 'OP01');
  });

  describe('With CHF as reference currency and some rates defined', function () {
    const rates = [
      new BN('1002500').mul(new BN(10).pow(new BN(18 - 8))),
      new BN('20722').mul(new BN(10).pow(new BN(18 - 18)))];
    beforeEach(async function () {
      await provider.defineCurrencies(
        [CHF, BTC, ETH], [2, 8, 18],
        rateOffset);
      await provider.defineRates(rates);
    });

    it('should have currencies', async function () {
      const expectedCurrencies = [
        'CHF', 'BTC', 'ETH',
      ].map((c) => web3.utils.toHex(c).padEnd(66, '0'));

      const currencies = await provider.currencies();
      assert.deepEqual(currencies[0], expectedCurrencies, 'currencies');
      assert.deepEqual(currencies[1].map((d) => d.toString()),
        ['2', '8', '18'],
        'decimals');
      assert.equal(currencies[2].toString(), rateOffset, 'rateOffset');
    });

    it('should have no rate for USD', async function () {
      const rate = await provider.rate(USD);
      assert.equal(rate.toString(), '0', 'no usd rate');
    });

    it('should have rate 1 for CHF', async function () {
      const rate = await provider.rate(CHF);
      assert.equal(rate.toString(), '1', ' rate 1');
    });

    it('should have rates', async function () {
      const foundRates = await provider.rates();
      assert.ok(foundRates[0] > 0, 'updatedAt');
      assert.deepEqual(foundRates[1].map((d) => d.toString()),
        rates.concat(['0']).map((d) => d.toString()), 'rates');
    });

    it('should convert CHFCent to WEI', async function () {
      const amountWEI = await provider.convert(1000, CHF, ETH);
      assert.equal(web3.utils.fromWei(amountWEI, 'ether'), '0.048257890165041984', '10.00 CHF in ETH');
    });

    it('should convert 1 ETH to CHFCent', async function () {
      const amountCHFCent = await provider.convert(ethToWei, ETH, CHF);
      assert.equal(amountCHFCent.toString(), '20722', '1 ETH to CHFCent');
    });

    it('should convert WEI to BTCSatoshi', async function () {
      const amountBTCSatoshi = await provider.convert(ethToWei, ETH, BTC);
      assert.equal(amountBTCSatoshi.toString(), '2067032', '1 ETH in BTCSatoshi');
    });

    it('should convert BTCSatoshi to WEI', async function () {
      const amountWEI =
        await provider.convert(oneBTCinSatoshi, BTC, ETH);
      assert.equal(web3.utils.fromWei(amountWEI, 'ether'), '48.378534890454589325', '1 BTC to ETH');
    });
  });
});
