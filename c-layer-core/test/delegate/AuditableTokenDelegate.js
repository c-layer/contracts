"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCoreMock = artifacts.require("TokenCoreMock.sol");
const AuditableTokenDelegate = artifacts.require("AuditableTokenDelegate.sol");
const AuditableTokenDelegateMock = artifacts.require("AuditableTokenDelegateMock.sol");
const UserRegistryMock = artifacts.require("UserRegistryMock.sol");
const RatesProviderMock = artifacts.require("RatesProviderMock.sol");

const AMOUNT = 1000000;
const NAME = "Token";
const SYMBOL = "TKN";
const DECIMALS = 18;

const evalAudit = function (audit, expected) {
  assert.equal(audit.createdAt.toString(), expected[0], "createdAt");
  assert.equal(audit.lastTransactionAt.toString(), expected[1], "lastTransactionAt");
  assert.equal(audit.lastEmissionAt.toString(), expected[2], "lastEmissionAt");
  assert.equal(audit.lastReceptionAt.toString(), expected[3], "lastReceptionAt");
  assert.equal(audit.cumulatedEmission.toString(), expected[4], "cumulatedEmission");
  assert.equal(audit.cumulatedReception.toString(), expected[5], "cumulatedReception");
};

contract("AuditableToken", function (accounts) {
  let core, delegate, token, userRegistry, ratesProvider;

  describe("with a token and no audits", function () {
    beforeEach(async function () {
      delegate = await AuditableTokenDelegate.new();
      core = await TokenCoreMock.new("Test", [ delegate.address ]);

      token = await TokenProxy.new(core.address);
      await core.defineToken(
        token.address, 0, NAME, SYMBOL, DECIMALS);
      await core.defineSupplyMock(token.address, AMOUNT);
      await token.approve(accounts[1], AMOUNT);
    });

    it("should have audit shared", async function () {
      const audit = await core.auditShared(token.address, 0);
      evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
    });

    it("should have token audit user", async function () {
      const audit = await core.auditUser(token.address, 0, 0);
      evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
    });

    it("should have token audit address", async function () {
      const audit = await core.auditAddress(token.address, 0, accounts[1]);
      evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
    });

    describe("With a transfer", function () {
      beforeEach(async function () {
        await token.transfer(accounts[1], "3333");
      });

      it("should have token audit address for sender", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[0]);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have token audit address for receiver", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[1]);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });
    });

    describe("With a transferFrom", function () {
      beforeEach(async function () {
        await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
      });

      it("should have token audit address for sender", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[0]);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have token audit address for sender", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[1]);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have token audit address for receiver", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[2]);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });
    });
  });

  describe("with a mocked delegate", function () {
    let block1Time;

    beforeEach(async function () {
      delegate = await AuditableTokenDelegateMock.new();
      core = await TokenCoreMock.new("Test", [ delegate.address ]);

      token = await TokenProxy.new(core.address);
      await core.defineToken(
        token.address, 0, NAME, SYMBOL, DECIMALS);
    });

    describe("and config 0 (Core scope 0, all datas, from selector and all fields)", function () {
      beforeEach(async function () {
        await core.defineAuditSelector(
          core.address, 0, [ accounts[1] ], [ true ]);
        await core.updateAuditMock(
          token.address,
          [ accounts[0], accounts[1], accounts[2] ], [ 1, 2, 3 ],
          [ 1, 4, 9 ], [ 2, 5, 10 ], [ 3, 6, 11 ],
          [ "42", "63" ], [ 0 ]);
        block1Time = (await web3.eth.getBlock("latest")).timestamp;
      });

      it("should have core 0 shared data", async function () {
        const audit = await core.auditShared(core.address, 0);
        evalAudit(audit, [ block1Time, block1Time, block1Time, block1Time, "63", "63" ]);
      });

      it("should have core 0 user data caller", async function () {
        const audit = await core.auditUser(core.address, 0, 1);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have core 0 user data sender", async function () {
        const audit = await core.auditUser(core.address, 0, 2);
        evalAudit(audit, [ block1Time, block1Time, block1Time, "0", "63", "0" ]);
      });

      it("should have core 0 user data receiver", async function () {
        const audit = await core.auditUser(core.address, 0, 3);
        evalAudit(audit, [ block1Time, block1Time, "0", block1Time, "0", "63" ]);
      });

      it("should have core 0 address data caller", async function () {
        const audit = await core.auditAddress(core.address, 0, accounts[0]);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have core 0 address data sender", async function () {
        const audit = await core.auditAddress(core.address, 0, accounts[1]);
        evalAudit(audit, [ block1Time, block1Time, block1Time, "0", "63", "0" ]);
      });

      it("should have core 0 address data receiver", async function () {
        const audit = await core.auditAddress(core.address, 0, accounts[2]);
        evalAudit(audit, [ block1Time, block1Time, "0", block1Time, "0", "63" ]);
      });
    });

    describe("and config 1 (Core scope 1, shared data, to selector and 2 fields)", function () {
      beforeEach(async function () {
        await core.defineAuditSelector(
          core.address, 1, [ accounts[2] ], [ true ]);
        await core.updateAuditMock(
          token.address,
          [ accounts[0], accounts[1], accounts[2] ], [ 1, 2, 3 ],
          [ 1, 4, 9 ], [ 2, 5, 10 ], [ 3, 6, 11 ],
          [ "42", "63" ], [ 1 ]);
        block1Time = (await web3.eth.getBlock("latest")).timestamp;
      });

      it("should have core 1 shared data", async function () {
        const audit = await core.auditShared(core.address, 1);
        evalAudit(audit, [ "0", "0", block1Time, "0", "63", "0" ]);
      });

      it("should have core 1 user data caller", async function () {
        const audit = await core.auditUser(core.address, 1, 1);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have core 1 user data sender", async function () {
        const audit = await core.auditUser(core.address, 1, 2);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have core 1 user data receiver", async function () {
        const audit = await core.auditUser(core.address, 1, 3);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have core 1 address data caller", async function () {
        const audit = await core.auditAddress(core.address, 1, accounts[0]);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have core 1 address data sender", async function () {
        const audit = await core.auditAddress(core.address, 1, accounts[1]);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have core 1 address data receiver", async function () {
        const audit = await core.auditAddress(core.address, 1, accounts[2]);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });
    });

    describe("and config 2 (Core scope 2, address data, both selector and 2 fields)", function () {
      beforeEach(async function () {
        await core.defineAuditSelector(
          core.address, 2, [ accounts[1], accounts[2] ], [ true, true ]);
        await core.updateAuditMock(
          token.address,
          [ accounts[0], accounts[1], accounts[2] ], [ 1, 2, 3 ],
          [ 1, 4, 9 ], [ 2, 5, 10 ], [ 3, 6, 11 ],
          [ "42", "63" ], [ 2 ]);
        block1Time = (await web3.eth.getBlock("latest")).timestamp;
      });

      it("should have core 2 shared data", async function () {
        const audit = await core.auditShared(core.address, 2);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have core 2 user data caller", async function () {
        const audit = await core.auditUser(core.address, 2, 1);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have core 2 user data sender", async function () {
        const audit = await core.auditUser(core.address, 2, 2);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have core 2 user data receiver", async function () {
        const audit = await core.auditUser(core.address, 2, 3);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have core 2 address data caller", async function () {
        const audit = await core.auditAddress(core.address, 2, accounts[0]);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have core 2 address data sender", async function () {
        const audit = await core.auditAddress(core.address, 2, accounts[1]);
        evalAudit(audit, [ block1Time, block1Time, "0", "0", "0", "0" ]);
      });

      it("should have core 2 address data receiver", async function () {
        const audit = await core.auditAddress(core.address, 2, accounts[2]);
        evalAudit(audit, [ block1Time, block1Time, "0", "0", "0", "0" ]);
      });
    });

    describe("and config 3 (Token scope 0, shared and address datas, no selectors and all fields)", function () {
      beforeEach(async function () {
        await core.updateAuditMock(
          token.address,
          [ accounts[0], accounts[1], accounts[2] ], [ 1, 2, 3 ],
          [ 1, 4, 9 ], [ 2, 5, 10 ], [ 3, 6, 11 ],
          [ "42", "63" ], [ 3 ]);
        block1Time = (await web3.eth.getBlock("latest")).timestamp;
      });

      it("should have token 0 shared data", async function () {
        const audit = await core.auditShared(token.address, 0);
        evalAudit(audit, [ block1Time, block1Time, block1Time, block1Time, "42", "42" ]);
      });

      it("should have token 0 user data caller", async function () {
        const audit = await core.auditUser(token.address, 0, 1);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have token 0 user data sender", async function () {
        const audit = await core.auditUser(token.address, 0, 2);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have token 0 user data receiver", async function () {
        const audit = await core.auditUser(token.address, 0, 3);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have token 0 address data caller", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[0]);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have token 0 address data sender", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[1]);
        evalAudit(audit, [ block1Time, block1Time, block1Time, "0", "42", "0" ]);
      });

      it("should have token 0 address data receiver", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[2]);
        evalAudit(audit, [ block1Time, block1Time, "0", block1Time, "0", "42" ]);
      });
    });
  });

  describe("with a token and many audits", function () {
    beforeEach(async function () {
      delegate = await AuditableTokenDelegateMock.new();
      core = await TokenCoreMock.new("Test", [ delegate.address ]);

      token = await TokenProxy.new(core.address);
      await core.defineToken(
        token.address, 0, NAME, SYMBOL, DECIMALS);
      await core.defineSupplyMock(token.address, AMOUNT);
      await token.approve(accounts[1], AMOUNT);

      userRegistry = await UserRegistryMock.new(
        [ accounts[0], accounts[1], accounts[2] ], [ 5, 5000000 ]);
      ratesProvider = await RatesProviderMock.new();
      await core.defineOracles(userRegistry.address, ratesProvider.address, [ 0, 1 ]);
    });

    describe("With a first transfer", function () {
      let block1Time;

      beforeEach(async function () {
        await token.transfer(accounts[1], "3333");
        block1Time = (await web3.eth.getBlock("latest")).timestamp;
      });

      it("should have token audit for sender address", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[0]);
        evalAudit(audit, [ block1Time, block1Time, block1Time, "0", "3333", "0" ]);
      });

      it("should have token audit for receiver", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[1]);
        evalAudit(audit, [ block1Time, block1Time, "0", block1Time, "0", "3333" ]);
      });

      it("should have token audit for sender address", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[0]);
        evalAudit(audit, [ block1Time, block1Time, block1Time, "0", "3333", "0" ]);
      });

      it("should have token audit for receiver", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[1]);
        evalAudit(audit, [ block1Time, block1Time, "0", block1Time, "0", "3333" ]);
      });
    });

    describe("With two transfers", function () {
      let block1Time, block2Time;

      beforeEach(async function () {
        await token.transfer(accounts[1], "3333");
        block1Time = (await web3.eth.getBlock("latest")).timestamp;
        await token.transfer(accounts[1], "3333");
        block2Time = (await web3.eth.getBlock("latest")).timestamp;
      });

      it("should have token audit for sender", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[0]);
        evalAudit(audit, [ block1Time, block2Time, block2Time, "0", "6666", "0" ]);
      });

      it("should have token audit for receiver", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[1]);
        evalAudit(audit, [ block1Time, block2Time, "0", block2Time, "0", "6666" ]);
      });
    });

    describe("With a first transferFrom", function () {
      let block1Time;

      beforeEach(async function () {
        await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
        block1Time = (await web3.eth.getBlock("latest")).timestamp;
      });

      it("should have token audit for sender", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[1]);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have token audit for 'from'", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[0]);
        evalAudit(audit, [ block1Time, block1Time, block1Time, "0", "3333", "0" ]);
      });

      it("should have token audit for 'to'", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[2]);
        evalAudit(audit, [ block1Time, block1Time, "0", block1Time, "0", "3333" ]);
      });
    });

    describe("With two transferFrom", function () {
      let block1Time, block2Time;

      beforeEach(async function () {
        await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
        block1Time = (await web3.eth.getBlock("latest")).timestamp;
        await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
        block2Time = (await web3.eth.getBlock("latest")).timestamp;
      });
 
      it("should have token audit for sender", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[1]);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have token audit for 'from'", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[0]);
        evalAudit(audit, [ block1Time, block2Time, block2Time, "0", "6666", "0" ]);
      });

      it("should have token audit for 'to'", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[2]);
        evalAudit(audit, [ block1Time, block2Time, "0", block2Time, "0", "6666" ]);
      });
    });
  });
});
