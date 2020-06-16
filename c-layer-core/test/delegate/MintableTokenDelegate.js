"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCore = artifacts.require("TokenCore.sol");
const MintableTokenDelegate = artifacts.require("MintableTokenDelegate.sol");

const AMOUNT = 1000000;
const NULL_ADDRESS = "0x".padEnd(42, "0");
const NAME = "Token";
const SYMBOL = "TKN";
const DECIMALS = 18;

contract("MintableTokenDelegate", function (accounts) {
  let core, delegate, token;

  beforeEach(async function () {
    delegate = await MintableTokenDelegate.new();
    core = await TokenCore.new("Test", [delegate.address]);
 
    token = await TokenProxy.new(core.address);
    await core.defineToken(
      token.address, 0, NAME, SYMBOL, DECIMALS);
  });

  it("should let operator mint", async function () {
    const tx = await core.mint(token.address, accounts[1], AMOUNT);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "Mint", "event");
    assert.equal(tx.logs[0].args.amount, AMOUNT, "amount");

    const tokenEvents = await token.getPastEvents("allEvents", {
      fromBlock: tx.logs[0].blockNumber,
      toBlock: tx.logs[0].blockNumber,
    });
    assert.equal(tokenEvents.length, 1, "events");
    assert.equal(tokenEvents[0].event, "Transfer", "event");
    assert.equal(tokenEvents[0].returnValues.from, NULL_ADDRESS, "from");
    assert.equal(tokenEvents[0].returnValues.to, accounts[1], "to");
    assert.equal(tokenEvents[0].returnValues.value, AMOUNT, "value");
  });

  it("should prevent non operator to mint", async function () {
    await assertRevert(core.mint(
      token.address, accounts[1], AMOUNT, { from: accounts[1] }), "OC03");
  });

  it("should let operator mintAtOnce", async function () {
    const recipients = [accounts[1], accounts[2], accounts[3]];
    const amounts = recipients.map((address, i) => AMOUNT * i);

    const tx = await core.mintAtOnce(token.address, recipients, amounts);

    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 4);

    const tokenEvents = await token.getPastEvents("allEvents", {
      fromBlock: tx.logs[0].blockNumber,
      toBlock: tx.logs[0].blockNumber,
    });
    assert.equal(tokenEvents.length, 3, "token events");
 
    recipients.forEach((address, i) => {
      assert.equal(tx.logs[i].event, "Mint", "event");
      assert.equal(tx.logs[i].args.amount, AMOUNT * i, "amount");
      assert.equal(tokenEvents[i].event, "Transfer", "event");
      assert.equal(tokenEvents[i].returnValues.from, NULL_ADDRESS, "from");
      assert.equal(tokenEvents[i].returnValues.to, address, "to");
      assert.equal(tokenEvents[i].returnValues.value, AMOUNT * i, "value");
    });
    assert.equal(tx.logs[3].event, "MintFinished", "event");
  });

  it("should prevent operator to mintAtOnce with inconsistent parameters", async function () {
    await assertRevert(core.mintAtOnce(token.address, [accounts[1]], []), "CO03");
  });

  it("should prevent non operator to mintAtOnce", async function () {
    await assertRevert(
      core.mintAtOnce(token.address, [accounts[1]], [AMOUNT], { from: accounts[1] }),
      "OC03");
  });

  describe("With tokens minted", function () {
    beforeEach(async function () {
      await core.mint(token.address, accounts[1], AMOUNT);
      await core.mint(token.address, accounts[2], 2 * AMOUNT);
    });

    it("should have a total supply", async function () {
      const supply = await token.totalSupply();
      assert.equal(supply.toString(), 3 * AMOUNT);
    });

    it("should not have finish minting", async function () {
      const tokenData = await core.token(token.address);
      assert.ok(!tokenData.mintingFinished, "not mint finished");
    });

    it("should let operator finish minting", async function () {
      const tx = await core.finishMinting(token.address);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "MintFinished", "event");
    });

    it("should prevent non operator to finish minting", async function () {
      await assertRevert(core.finishMinting(token.address, { from: accounts[1] }), "OC03");
    });

    describe("With minting finished", function () {
      beforeEach(async function () {
        await core.finishMinting(token.address);
      });

      it("should have finish minting", async function () {
        const tokenData = await core.token(token.address);
        assert.ok(tokenData.mintingFinished, "mint finished");
      });

      it("should prevent operator to mint again", async function () {
        await assertRevert(core.mint(token.address, accounts[1], AMOUNT), "CO03");
      });

      it("should prevent operator to finish mintingt again", async function () {
        await assertRevert(core.finishMinting(token.address), "CO03");
      });
    });
  });
});
