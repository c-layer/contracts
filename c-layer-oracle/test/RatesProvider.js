"user strict";

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require("./helpers/assertRevert");
const BN = require("bn.js");
const RatesProvider = artifacts.require("RatesProvider.sol");

contract("RatesProvider", function (accounts) {
  let provider;

  const now = new Date().getTime() / 1000;
  const CHF = 5;
  const ethToWei = new BN("10").pow(new BN("18"));
  const aWEICHFSample = "4825789016504";
  const aETHCHFSample = "207220";
  const dayPlusOneTime = Math.floor((new Date()).getTime() / 1000) + 3600 * 24;
  const dayMinusOneTime = Math.floor((new Date()).getTime() / 1000) - 3600 * 24;

  beforeEach(async function () {
    provider = await RatesProvider.new("Test");
  });

  it("should have a name", async function () {
    const name = await provider.name();
    assert.equal(name, "Test", "name");
  });

  it("should have an update date", async function () {
    const updatedAt = await provider.updatedAt();
    assert.equal(updatedAt.toString(), "0", "updatedAt");
  });

  it("should convert rate from ETHCHF", async function () {
    const rateWEICHFCent = await provider.convertRate(aETHCHFSample, 2);
    assert.equal(rateWEICHFCent.toString(), aWEICHFSample, "rate from ETHCHF");
  });

  it("should convert rate to ETHCHF", async function () {
    const rateETHCHF = await provider.convertRate(aWEICHFSample, 2);
    assert.equal(rateETHCHF.toString(), aETHCHFSample, "rate to ETHCHF");
  });

  it("should convert CHF Cent to 0", async function () {
    const amountWEI = await provider.convertToWEI(CHF, 1000);
    assert.equal(amountWEI.toString(), "0", "WEICHFCents");
  });

  it("should convert WEI to CHFCent to 0", async function () {
    const amountCHFCent = await provider.convertFromWEI(CHF, ethToWei);
    assert.equal(amountCHFCent.toString(), "0", "no rates");
  });

  it("should have 0 rate WEICHFCent", async function () {
    const rateWEICHFCent = await provider.rate(CHF);
    assert.equal(rateWEICHFCent.toString(), "0", "WEICHFCents");
  });

  it("should have 0 rate ETHCHF", async function () {
    const rateETHCHF = await provider.rateETH(CHF, 2);
    assert.equal(rateETHCHF.toString(), "0", "no rates");
  });

  it("should let operator define a rate", async function () {
    const tx = await provider.defineRates([ 0, 0, 0, 0, aWEICHFSample ]);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "Rate", "event");
    assert.ok(tx.logs[0].args.at > dayMinusOneTime, "before");
    assert.ok(tx.logs[0].args.at < dayPlusOneTime, "after");
    assert.equal(tx.logs[0].args.currency, CHF, "currency");
    assert.ok(tx.logs[0].args.rateFromWEI.toString(), aWEICHFSample, "rate");
  });

  it("should prevent anyone from defining a rate", async function () {
    await assertRevert(
      provider.defineRates([ 0, 0, 0, 0, aWEICHFSample ], { from: accounts[1] }), "OP01");
  });

  describe("With a rates defined", async function () {
    beforeEach(async function () {
      await provider.defineRates([ 0, 0, 0, 0, aWEICHFSample ]);
    });

    it("should have an update date", async function () {
      const updatedAt = await provider.updatedAt();
      assert.ok(updatedAt > now, "updatedAt");
    });

    it("should convert CHF Cent to 0", async function () {
      const amountWEI = await provider.convertToWEI(CHF, 1000);
      assert.equal(amountWEI.toString(), aWEICHFSample + "000", "WEICHFCents");
    });

    it("should convert WEI to CHFCent to 0", async function () {
      const amountCHFCent = await provider.convertFromWEI(CHF, ethToWei);
      assert.equal(amountCHFCent.toString(), aETHCHFSample, "no rates");
    });
  });
});
