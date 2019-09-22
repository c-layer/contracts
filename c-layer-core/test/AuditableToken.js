"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("./helpers/assertRevert");
const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCore = artifacts.require("TokenCoreMock.sol");
const AuditableTokenDelegate = artifacts.require("AuditableTokenDelegate.sol");

const AMOUNT = 1000000;
const NULL_ADDRESS = "0x".padEnd(42, "0");
const NAME = "Token", SYMBOL = "TKN", DECIMALS = 18;

contract("AuditableToken", function (accounts) {
  let core, delegate, token;

  beforeEach(async function () {
    delegate = await AuditableTokenDelegate.new();
    core = await TokenCore.new("Test", [ delegate.address ]);
 
    token = await TokenProxy.new(core.address);
    await core.defineToken(
      token.address, 0, NAME, SYMBOL, DECIMALS);
    await core.defineSupply(token.address, AMOUNT);
    await token.approve(accounts[1], AMOUNT);
  });

  it("should have token audit", async function () {
    const audit = await core.tokenAuditByAddress(token.address, 0, accounts[1]);
    assert.equal(audit.createdAt.toString(), "0", "createdAt");
    assert.equal(audit.lastTransactionAt.toString(), "0", "lastTransactionAt");
    assert.equal(audit.lastReceptionAt.toString(), "0", "lastReceptionAt");
    assert.equal(audit.lastEmissionAt.toString(), "0", "lastEmissionAt");
    assert.equal(audit.cumulatedReception.toString(), "0", "cumulatedReception");
    assert.equal(audit.cumulatedEmission.toString(), "0", "cumulatedEmission");
  });

  describe("With a first transfer", async function () {

    beforeEach(async function() {
      await token.transfer(accounts[1], "3333");
    });

    it("should have token audit for sender", async function () {
      const audit = await core.tokenAuditByAddress(token.address, 0, accounts[0]);
      assert.ok(audit.createdAt > 0, "createdAt");
      assert.ok(audit.lastTransactionAt > 0, "lastTransactionAt");
      assert.equal(audit.lastReceptionAt.toString(), "0", "lastReceptionAt");
      assert.equal(audit.lastEmissionAt.toString(), "0", "lastEmissionAt");
      assert.equal(audit.cumulatedReception.toString(), "0", "cumulatedReception");
      assert.equal(audit.cumulatedEmission.toString(), "3333", "cumulatedEmission");
    });

    it("should have token audit for receiver", async function () {
      const audit = await core.tokenAuditByAddress(token.address, 0, accounts[1]);
      assert.ok(audit.createdAt > 0, "createdAt");
      assert.ok(audit.lastTransactionAt > 0, "lastTransactionAt");
      assert.equal(audit.lastReceptionAt.toString(), "0", "lastReceptionAt");
      assert.equal(audit.lastEmissionAt.toString(), "0", "lastEmissionAt");
      assert.equal(audit.cumulatedReception.toString(), "3333", "cumulatedReception");
      assert.equal(audit.cumulatedEmission.toString(), "0", "cumulatedEmission");
    });
  });

  describe("With two transfers", async function () {
    let block1Time, block2Time;

    beforeEach(async function() {
      await token.transfer(accounts[1], "3333");
      block1Time = (await web3.eth.getBlock('latest')).timestamp;
      await token.transfer(accounts[1], "3333");
      block2Time = (await web3.eth.getBlock('latest')).timestamp;
    });

    it("should have token audit for sender", async function () {
      const audit = await core.tokenAuditByAddress(token.address, 0, accounts[0]);
      assert.equal(audit.createdAt, block1Time, "createdAt");
      assert.equal(audit.lastTransactionAt, block2Time, "lastTransactionAt");
      assert.equal(audit.lastReceptionAt.toString(), "0", "lastReceptionAt");
      assert.equal(audit.lastEmissionAt.toString(), "0", "lastEmissionAt");
      assert.equal(audit.cumulatedReception.toString(), "0", "cumulatedReception");
      assert.equal(audit.cumulatedEmission.toString(), "6666", "cumulatedEmission");
    });

    it("should have token audit for receiver", async function () {
      const audit = await core.tokenAuditByAddress(token.address, 0, accounts[1]);
      assert.equal(audit.createdAt, block1Time, "createdAt");
      assert.equal(audit.lastTransactionAt, block2Time, "lastTransactionAt");
      assert.equal(audit.lastReceptionAt.toString(), "0", "lastReceptionAt");
      assert.equal(audit.lastEmissionAt.toString(), "0", "lastEmissionAt");
      assert.equal(audit.cumulatedReception.toString(), "6666", "cumulatedReception");
      assert.equal(audit.cumulatedEmission.toString(), "0", "cumulatedEmission");
    });
  });

  describe("With a first transferFrom", async function () {

    beforeEach(async function() {
      await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
    });

    it("should have token audit for sender", async function () {
      const audit = await core.tokenAuditByAddress(token.address, 0, accounts[1]);
      assert.equal(audit.createdAt.toString(), "0", "createdAt");
      assert.equal(audit.lastTransactionAt.toString(), "0", "lastTransactionAt");
      assert.equal(audit.lastReceptionAt.toString(), "0", "lastReceptionAt");
      assert.equal(audit.lastEmissionAt.toString(), "0", "lastEmissionAt");
      assert.equal(audit.cumulatedReception.toString(), "0", "cumulatedReception");
      assert.equal(audit.cumulatedEmission.toString(), "0", "cumulatedEmission");
    });

    it("should have token audit for 'from'", async function () {
      const audit = await core.tokenAuditByAddress(token.address, 0, accounts[0]);
      assert.ok(audit.createdAt > 0, "createdAt");
      assert.ok(audit.lastTransactionAt > 0, "lastTransactionAt");
      assert.equal(audit.lastReceptionAt.toString(), "0", "lastReceptionAt");
      assert.equal(audit.lastEmissionAt.toString(), "0", "lastEmissionAt");
      assert.equal(audit.cumulatedReception.toString(), "0", "cumulatedReception");
      assert.equal(audit.cumulatedEmission.toString(), "3333", "cumulatedEmission");
    });

    it("should have token audit for 'to'", async function () {
      const audit = await core.tokenAuditByAddress(token.address, 0, accounts[2]);
      assert.ok(audit.createdAt > 0, "createdAt");
      assert.ok(audit.lastTransactionAt > 0, "lastTransactionAt");
      assert.equal(audit.lastReceptionAt.toString(), "0", "lastReceptionAt");
      assert.equal(audit.lastEmissionAt.toString(), "0", "lastEmissionAt");
      assert.equal(audit.cumulatedReception.toString(), "3333", "cumulatedReception");
      assert.equal(audit.cumulatedEmission.toString(), "0", "cumulatedEmission");
    });
  });

  describe("With two transferFrom", async function () {
    let block1Time, block2Time;

    beforeEach(async function() {
      await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
      block1Time = (await web3.eth.getBlock('latest')).timestamp;
      await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
      block2Time = (await web3.eth.getBlock('latest')).timestamp;
    });

    it("should have token audit for sender", async function () {
      const audit = await core.tokenAuditByAddress(token.address, 0, accounts[1]);
      assert.equal(audit.createdAt.toString(), "0",  "createdAt");
      assert.equal(audit.lastTransactionAt.toString(), "0", "lastTransactionAt");
      assert.equal(audit.lastReceptionAt.toString(), "0", "lastReceptionAt");
      assert.equal(audit.lastEmissionAt.toString(), "0", "lastEmissionAt");
      assert.equal(audit.cumulatedReception.toString(), "0", "cumulatedReception");
      assert.equal(audit.cumulatedEmission.toString(), "0", "cumulatedEmission");
    });

    it("should have token audit for 'from'", async function () {
      const audit = await core.tokenAuditByAddress(token.address, 0, accounts[0]);
      assert.equal(audit.createdAt, block1Time, "createdAt");
      assert.equal(audit.lastTransactionAt, block2Time, "lastTransactionAt");
      assert.equal(audit.lastReceptionAt.toString(), "0", "lastReceptionAt");
      assert.equal(audit.lastEmissionAt.toString(), "0", "lastEmissionAt");
      assert.equal(audit.cumulatedReception.toString(), "0", "cumulatedReception");
      assert.equal(audit.cumulatedEmission.toString(), "6666", "cumulatedEmission");
    });

    it("should have token audit for 'to'", async function () {
      const audit = await core.tokenAuditByAddress(token.address, 0, accounts[2]);
      assert.equal(audit.createdAt, block1Time, "createdAt");
      assert.equal(audit.lastTransactionAt, block2Time, "lastTransactionAt");
      assert.equal(audit.lastReceptionAt.toString(), "0", "lastReceptionAt");
      assert.equal(audit.lastEmissionAt.toString(), "0", "lastEmissionAt");
      assert.equal(audit.cumulatedReception.toString(), "6666", "cumulatedReception");
      assert.equal(audit.cumulatedEmission.toString(), "0", "cumulatedEmission");
    });
  });
});
