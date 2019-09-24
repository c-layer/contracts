"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("./helpers/assertRevert");
const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCore = artifacts.require("TokenCoreMock.sol");
const AuditableTokenDelegate = artifacts.require("AuditableTokenDelegate.sol");
const UserRegistryMock = artifacts.require("UserRegistryMock.sol");
const RatesProviderMock = artifacts.require("RatesProviderMock.sol");

const AMOUNT = 1000000;
const NULL_ADDRESS = "0x".padEnd(42, "0");
const NAME = "Token", SYMBOL = "TKN", DECIMALS = 18;
const CHF = web3.utils.toHex("CHF").padEnd(66, "0");

const evalAudit = function(audit, expected) {
  assert.equal(audit.createdAt.toString(), expected[0], "createdAt");
  assert.equal(audit.lastTransactionAt.toString(), expected[1], "lastTransactionAt");
  assert.equal(audit.lastReceptionAt.toString(), expected[2], "lastReceptionAt");
  assert.equal(audit.lastEmissionAt.toString(), expected[3], "lastEmissionAt");
  assert.equal(audit.cumulatedReception.toString(), expected[4], "cumulatedReception");
  assert.equal(audit.cumulatedEmission.toString(), expected[5], "cumulatedEmission");
}

contract("AuditableToken", function (accounts) {
  let core, delegate, token, userRegistry, ratesProvider;

  describe("with token scope Id 0, byAddress, all fields", function() {
    const AUDIT_MODE = "0xfc80";

    beforeEach(async function () {
      delegate = await AuditableTokenDelegate.new();
      core = await TokenCore.new("Test", [ delegate.address ], [ AUDIT_MODE ]);

      token = await TokenProxy.new(core.address);
      await core.defineToken(
        token.address, 0, NAME, SYMBOL, DECIMALS);
      await core.defineSupply(token.address, AMOUNT);
      await token.approve(accounts[1], AMOUNT);
    });

    it("should have token audit", async function () {
      const audit = await core.tokenAuditByAddress(token.address, 0, accounts[1]);
      evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
    });

    it("should have a default audit modes", async function () {
      const auditModes = await core.auditModes();
      assert.deepEqual(auditModes, [ AUDIT_MODE ], "auditModes");
    });

    it("should evaluate audit modes", async function () {
      const evalAuditMode = await delegate.evalAuditMode(AUDIT_MODE);

      assert.equal(evalAuditMode.scopeId.toString(), 0, "scopeId");
      assert.ok(evalAuditMode.isTokenScope, "isTokenScope");
      assert.equal(evalAuditMode.auditData.toString(), 2, "auditMode=byAddress");
      assert.ok(!evalAuditMode.isSelectorFrom, "isSelectorFrom");
      assert.ok(!evalAuditMode.isSelectorTo, "isSelectorTo");
      assert.deepEqual(evalAuditMode.fields, [ true, true, true, true, true, true ], "all fields");
    });

    describe("With a first transfer", async function () {
      let block1Time;

      beforeEach(async function() {
        await token.transfer(accounts[1], "3333");
        block1Time = (await web3.eth.getBlock('latest')).timestamp;
      });

      it("should have token audit for sender", async function () {
        const audit = await core.tokenAuditByAddress(token.address, 0, accounts[0]);
        evalAudit(audit, [ block1Time, block1Time, "0", block1Time, "0", "3333" ]);
      });

      it("should have token audit for receiver", async function () {
        const audit = await core.tokenAuditByAddress(token.address, 0, accounts[1]);
        evalAudit(audit, [ block1Time, block1Time, block1Time, "0", "3333", "0" ]);
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
        evalAudit(audit, [ block1Time, block2Time, "0", block2Time, "0", "6666" ]);
      });

      it("should have token audit for receiver", async function () {
        const audit = await core.tokenAuditByAddress(token.address, 0, accounts[1]);
        evalAudit(audit, [ block1Time, block2Time, block2Time, "0", "6666", "0" ]);
      });
    });

    describe("With a first transferFrom", async function () {
      let block1Time;

      beforeEach(async function() {
        await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
        block1Time = (await web3.eth.getBlock('latest')).timestamp;
      });

      it("should have token audit for sender", async function () {
        const audit = await core.tokenAuditByAddress(token.address, 0, accounts[1]);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

     it("should have token audit for 'from'", async function () {
        const audit = await core.tokenAuditByAddress(token.address, 0, accounts[0]);
        evalAudit(audit, [ block1Time, block1Time, "0", block1Time, "0", "3333" ]);
      });

      it("should have token audit for 'to'", async function () {
        const audit = await core.tokenAuditByAddress(token.address, 0, accounts[2]);
        evalAudit(audit, [ block1Time, block1Time, block1Time, "0", "3333", "0" ]);
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
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have token audit for 'from'", async function () {
        const audit = await core.tokenAuditByAddress(token.address, 0, accounts[0]);
        evalAudit(audit, [ block1Time, block2Time, "0", block2Time, "0", "6666" ]);
      });

      it("should have token audit for 'to'", async function () {
        const audit = await core.tokenAuditByAddress(token.address, 0, accounts[2]);
        evalAudit(audit, [ block1Time, block2Time, block2Time, "0", "6666", "0" ]);
      });
    });
  });

  describe("with token scope Id 2, byUser, reception fields only", function() {
    const AUDIT_MODE = "0xa042";

    beforeEach(async function () {
      delegate = await AuditableTokenDelegate.new();
      core = await TokenCore.new("Test", [ delegate.address ], [ AUDIT_MODE ]);

      token = await TokenProxy.new(core.address);
      await core.defineToken(
        token.address, 0, NAME, SYMBOL, DECIMALS);
      await core.defineSupply(token.address, AMOUNT);
      await token.approve(accounts[1], AMOUNT);
    });

    it("should have token audit", async function () {
      const audit = await core.tokenAuditByUser(token.address, 2, 1);
      evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
    });

    it("should have a default audit modes", async function () {
      const auditModes = await core.auditModes();
      assert.deepEqual(auditModes, [ AUDIT_MODE ], "auditModes");
    });

    it("should evaluate audit modes", async function () {
      const evalAuditMode = await delegate.evalAuditMode(AUDIT_MODE);

      assert.equal(evalAuditMode.scopeId.toString(), 2, "scopeId");
      assert.ok(evalAuditMode.isTokenScope, "isTokenScope");
      assert.equal(evalAuditMode.auditData.toString(), 1, "auditMode=byUser");
      assert.ok(!evalAuditMode.isSelectorFrom, "isSelectorFrom");
      assert.ok(!evalAuditMode.isSelectorTo, "isSelectorTo");
      assert.deepEqual(evalAuditMode.fields, [ false, false, false, true, false, true ], "all fields");
    });

    it("should prevent transfer", async function () {
      await assertRevert(token.transfer(accounts[1], "3333"), "CO02");
    });

    it("should prevent transferFrom", async function () {
      await assertRevert(
        token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] }), "CO02");
    });

    describe("with user registry defined", function () {
      beforeEach(async function () {
        userRegistry = await UserRegistryMock.new([ accounts[0], accounts[1], accounts[2] ]);
        await core.defineOracles(userRegistry.address, accounts[0]);
      });

      it("should have a user registry and a currency", async function () {
        const oracles = await core.oracles();
        assert.equal(oracles[0], userRegistry.address, "user registry");
        assert.equal(oracles[2], CHF, "currency");
      });

      describe("With a first transfer", async function () {
        let block1Time;

        beforeEach(async function() {
          await token.transfer(accounts[1], "3333");
          block1Time = (await web3.eth.getBlock('latest')).timestamp;
        });

        it("should have token audit for sender", async function () {
          const audit = await core.tokenAuditByUser(token.address, 2, 1);
          evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
        });

        it("should have token audit for receiver", async function () {
          const audit = await core.tokenAuditByUser(token.address, 2, 2);
          evalAudit(audit, [ "0", "0", block1Time, "0", "3333", "0" ]);
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
          const audit = await core.tokenAuditByUser(token.address, 2, 1);
          evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
        });

        it("should have token audit for receiver", async function () {
          const audit = await core.tokenAuditByUser(token.address, 2, 2);
          evalAudit(audit, [ "0", "0", block2Time, "0", "6666", "0" ]);
        });
      });

      describe("With a first transferFrom", async function () {
        let block1Time;

        beforeEach(async function() {
          await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
          block1Time = (await web3.eth.getBlock('latest')).timestamp;
        });

        it("should have token audit for sender", async function () {
          const audit = await core.tokenAuditByUser(token.address, 2, 2);
          evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
        });

        it("should have token audit for 'from'", async function () {
          const audit = await core.tokenAuditByUser(token.address, 2, 1);
          evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
        });

        it("should have token audit for 'to'", async function () {
          const audit = await core.tokenAuditByUser(token.address, 2, 3);
          evalAudit(audit, [ "0", "0", block1Time, "0", "3333", "0" ]);
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
          const audit = await core.tokenAuditByUser(token.address, 2, 2);
          evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
        });

        it("should have token audit for 'from'", async function () {
          const audit = await core.tokenAuditByUser(token.address, 2, 1);
          evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
        });

        it("should have token audit for 'to'", async function () {
          const audit = await core.tokenAuditByUser(token.address, 2, 3);
          evalAudit(audit, [ "0", "0", block2Time, "0", "6666", "0" ]);
        });
      });
    });
  });

  describe("with core scope Id 31, shared, cumulated emission and reception", function() {
    const AUDIT_MODE = "0xc03f";

    beforeEach(async function () {
      delegate = await AuditableTokenDelegate.new();
      core = await TokenCore.new("Test", [ delegate.address ], [ AUDIT_MODE ]);

      token = await TokenProxy.new(core.address);
      await core.defineToken(
        token.address, 0, NAME, SYMBOL, DECIMALS);
      await core.defineSupply(token.address, AMOUNT);
      await token.approve(accounts[1], AMOUNT);
    });

    it("should have token audit", async function () {
      const audit = await core.auditShared(31);
      evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
    });

    it("should have a default audit modes", async function () {
      const auditModes = await core.auditModes();
      assert.deepEqual(auditModes, [ AUDIT_MODE ], "auditModes");
    });

    it("should evaluate audit modes", async function () {
      const evalAuditMode = await delegate.evalAuditMode(AUDIT_MODE);

      assert.equal(evalAuditMode.scopeId.toString(), 31, "scopeId");
      assert.ok(!evalAuditMode.isTokenScope, "isCoreScope");
      assert.equal(evalAuditMode.auditData.toString(), 0, "auditMode=shared");
      assert.ok(!evalAuditMode.isSelectorFrom, "isSelectorFrom");
      assert.ok(!evalAuditMode.isSelectorTo, "isSelectorTo");
      assert.deepEqual(evalAuditMode.fields, [ false, false, false, false, true, true ], "cumulated fields");
    });

    it("should prevent transfer", async function () {
      await assertRevert(token.transfer(accounts[1], "3333"), "CO02");
    });

    it("should prevent transferFrom", async function () {
      await assertRevert(
        token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] }), "CO02");
    });

    describe("with oracles defined", function () {
      beforeEach(async function () {
        userRegistry = await UserRegistryMock.new([ accounts[0], accounts[1], accounts[2] ]);
        ratesProvider = await RatesProviderMock.new();
        await core.defineOracles(userRegistry.address, ratesProvider.address);
      });

      it("should have a user registry, a rates provider and a currency", async function () {
        const oracles = await core.oracles();
        assert.equal(oracles[0], userRegistry.address, "user registry");
        assert.equal(oracles[1], ratesProvider.address, "ratesProvider");
        assert.equal(oracles[2], CHF, "currency");
      });

      describe("With a first transfer", async function () {

        beforeEach(async function() {
          await token.transfer(accounts[1], "3333");
        });

        it("should have audit shared", async function () {
          const audit = await core.auditShared(31);
          evalAudit(audit, [ "0", "0", "0", "0", "4999", "4999" ]);
        });
      });

      describe("With two transfers", async function () {
        beforeEach(async function() {
          await token.transfer(accounts[1], "3333");
          await token.transfer(accounts[1], "3333");
        });

        it("should have token audit for receiver", async function () {
          const audit = await core.auditShared(31);
          evalAudit(audit, [ "0", "0", "0", "0", "9998", "9998" ]);
        });
      });

      describe("With a first transferFrom", async function () {

        beforeEach(async function() {
          await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
        });

        it("should have audit shared", async function () {
          const audit = await core.auditShared(31);
          evalAudit(audit, [ "0", "0", "0", "0", "4999", "4999" ]);
        });
      });

      describe("With two transferFrom", async function () {

        beforeEach(async function() {
          await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
          await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
        });
 
        it("should have audit shared", async function () {
          const audit = await core.auditShared(31);
          evalAudit(audit, [ "0", "0", "0", "0", "9998", "9998" ]);
        });
      });
    });
  });

  describe("with token scope Id 12, byAddress, fromSelector, toSelector, last transaction", function() {
    const AUDIT_MODE = "0x0b8c";

    beforeEach(async function () {
      delegate = await AuditableTokenDelegate.new();
      core = await TokenCore.new("Test", [ delegate.address ], [ AUDIT_MODE ]);

      token = await TokenProxy.new(core.address);
      await core.defineToken(
        token.address, 0, NAME, SYMBOL, DECIMALS);
      await core.defineSupply(token.address, AMOUNT);
      await token.approve(accounts[1], AMOUNT);
    });

    it("should have token audit", async function () {
      const audit = await core.tokenAuditByAddress(token.address, 0, accounts[1]);
      evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
    });

    it("should have a default audit modes", async function () {
      const auditModes = await core.auditModes();
      assert.deepEqual(auditModes, [ AUDIT_MODE ], "auditModes");
    });

    it("should evaluate audit modes", async function () {
      const evalAuditMode = await delegate.evalAuditMode(AUDIT_MODE);

      assert.equal(evalAuditMode.scopeId.toString(), 12, "scopeId");
      assert.ok(evalAuditMode.isTokenScope, "isTokenScope");
      assert.equal(evalAuditMode.auditData.toString(), 2, "auditMode=byAddress");
      assert.ok(evalAuditMode.isSelectorFrom, "isSelectorFrom");
      assert.ok(evalAuditMode.isSelectorTo, "isSelectorTo");
      assert.deepEqual(evalAuditMode.fields, [ false, true, false, false, false, false ], "all fields");
    });

    it("should define audit selector", async function () {
      const tx = await core.defineAuditSelector(
        delegate.address, 0, [ accounts[0], accounts[1] ], [ true, false ], [ false, true ]);
    });

    describe("With a first transfer", async function () {
      let block1Time;

      beforeEach(async function() {
        await token.transfer(accounts[1], "3333");
        block1Time = (await web3.eth.getBlock('latest')).timestamp;
      });

      it("should have token audit for sender", async function () {
        const audit = await core.tokenAuditByAddress(token.address, 12, accounts[0]);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have token audit for receiver", async function () {
        const audit = await core.tokenAuditByAddress(token.address, 12, accounts[1]);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });
    });

    describe("With a first transferFrom", async function () {
      let block1Time;

      beforeEach(async function() {
        await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
        block1Time = (await web3.eth.getBlock('latest')).timestamp;
      });

      it("should have token audit for sender", async function () {
        const audit = await core.tokenAuditByAddress(token.address, 12, accounts[1]);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

     it("should have token audit for 'from'", async function () {
        const audit = await core.tokenAuditByAddress(token.address, 12, accounts[0]);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });

      it("should have token audit for 'to'", async function () {
        const audit = await core.tokenAuditByAddress(token.address, 12, accounts[2]);
        evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
      });
    });

    describe("With audit selector defined", async function () {

      beforeEach(async function () {
        await core.defineAuditSelector(
          delegate.address, 0,
          [ accounts[0], accounts[1], accounts[2] ],
          [ true, false, false ],
          [ false, true, true ]);
      });

      it("should have audit selector", async function () {
        const selector = await core.auditSelector(
          delegate.address, 0,
          [ accounts[0], accounts[1], accounts[2], accounts[3] ]);
        assert.deepEqual(selector[0], [ true, false, false, false ], "from selector");
        assert.deepEqual(selector[1], [ false, true, true, false ], "to selector");
      });

      describe("With a first transfer", async function () {
        let block1Time;

        beforeEach(async function() {
          await token.transfer(accounts[1], "3333");
          block1Time = (await web3.eth.getBlock('latest')).timestamp;
        });

        it("should have token audit for sender", async function () {
          const audit = await core.tokenAuditByAddress(token.address, 12, accounts[0]);
          evalAudit(audit, [ "0", block1Time, "0", "0", "0", "0" ]);
        });

        it("should have token audit for receiver", async function () {
          const audit = await core.tokenAuditByAddress(token.address, 12, accounts[1]);
          evalAudit(audit, [ "0", block1Time, "0", "0", "0", "0" ]);
        });
      });

      describe("With a first transferFrom", async function () {
        let block1Time;

        beforeEach(async function() {
          await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
          block1Time = (await web3.eth.getBlock('latest')).timestamp;
        });

        it("should have token audit for sender", async function () {
          const audit = await core.tokenAuditByAddress(token.address, 12, accounts[1]);
          evalAudit(audit, [ "0", "0", "0", "0", "0", "0" ]);
        });

        it("should have token audit for 'from'", async function () {
          const audit = await core.tokenAuditByAddress(token.address, 12, accounts[0]);
          evalAudit(audit, [ "0", block1Time, "0", "0", "0", "0" ]);
        });

        it("should have token audit for 'to'", async function () {
          const audit = await core.tokenAuditByAddress(token.address, 12, accounts[2]);
          evalAudit(audit, [ "0", block1Time, "0", "0", "0", "0" ]);
        });
      });
    });
  });
});
