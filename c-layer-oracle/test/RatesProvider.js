"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@mtpelerin.com>
 *
 * Copyright © 2016 - 2018 Mt Pelerin Group SA - All Rights Reserved
 * This content cannot be used, copied or reproduced in part or in whole
 * without the express and written permission of Mt Pelerin Group SA.
 * Written by *Mt Pelerin Group SA*, <info@mtpelerin.com>
 * All matters regarding the intellectual property of this code or software
 * are subjects to Swiss Law without reference to its conflicts of law rules.
 *
 */

const assertRevert = require("./helpers/assertRevert");
const BN = require("bn.js");
const RatesProvider = artifacts.require("RatesProvider.sol");

contract("RatesProvider", function (accounts) {
  let provider;

  const CHF = 5;
  const ethToWei = new BN("10").pow(new BN("18"));
  const aWEICHFSample = "4825789016504";
  const aETHCHFSample = "207220";
  const dayPlusOneTime = Math.floor((new Date()).getTime() / 1000) + 3600 * 24;
  const dayMinusOneTime = Math.floor((new Date()).getTime() / 1000) - 3600 * 24;

  beforeEach(async function () {
    provider = await RatesProvider.new();
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
    const tx = await provider.defineRate(CHF, aWEICHFSample);
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
      provider.defineRate(CHF, aWEICHFSample, { from: accounts[1] }), "OP01");
  });

  it("should let authority define an ETHCHF rate", async function () {
    const tx = await provider.defineETHRate(CHF, aETHCHFSample, 2);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "Rate", "event");
    assert.ok(tx.logs[0].args.at > dayMinusOneTime, "before");
    assert.ok(tx.logs[0].args.at < dayPlusOneTime, "after");
    assert.equal(tx.logs[0].args.currency, CHF, "currency");
    assert.ok(tx.logs[0].args.rateFromWEI.toString(), aWEICHFSample, "rate");
  });

  it("should prevent anyone from defining an ETHCHF rate", async function () {
    await assertRevert(
      provider.defineETHRate(CHF, aETHCHFSample, 2, { from: accounts[1] }),
      "OP01");
  });

  describe("With a rate defined", async function () {
    beforeEach(async function () {
      await provider.defineRate(CHF, aWEICHFSample);
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
