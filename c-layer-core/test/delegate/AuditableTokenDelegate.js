"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCoreMock = artifacts.require("TokenCoreMock.sol");
const AuditableTokenDelegate = artifacts.require("AuditableTokenDelegate.sol");
const UserRegistryMock = artifacts.require("UserRegistryMock.sol");
const RatesProviderMock = artifacts.require("RatesProviderMock.sol");

const AMOUNT = 1000000;
const NAME = "Token";
const SYMBOL = "TKN";
const DECIMALS = 18;
const CHF = web3.utils.toHex("CHF").padEnd(66, "0");
// const AUDIT_NEVER = 0;
const AUDIT_TRIGGERS_ONLY = 1;
const AUDIT_TRIGGERS_EXCLUDED = 2;
const AUDIT_ALWAYS = 3;
const AUDIT_STORAGE_ADDRESS = 0;
const AUDIT_STORAGE_USER_ID = 1;
const AUDIT_STORAGE_SHARED = 2;

const CONFIGURATIONS = [[
  0, true, // scopes
  AUDIT_TRIGGERS_ONLY, AUDIT_STORAGE_ADDRESS,
  [0, 1, 2], "0x", CHF,
  [true, true, true, true, true, true], // fields
], [
  1, true, // scopes
  AUDIT_TRIGGERS_EXCLUDED, AUDIT_STORAGE_USER_ID,
  [0, 1, 2], "0x", CHF,
  [false, false, true, true, true, true], // fields
], [
  2, true, // scopes
  AUDIT_ALWAYS, AUDIT_STORAGE_ADDRESS,
  [0, 1, 2], "0x", CHF,
  [true, true, false, false, false, false], // fields
], [
  0, false, // scopes
  AUDIT_ALWAYS, AUDIT_STORAGE_SHARED,
  [0, 1, 2], "0x", CHF,
  [true, true, true, true, true, true], // fields
]];

const evalAudit = function (audit, expected) {
  assert.deepEqual([
    audit.createdAt.toString(),
    audit.lastTransactionAt.toString(),
    audit.lastEmissionAt.toString(),
    audit.lastReceptionAt.toString(),
    audit.cumulatedEmission.toString(),
    audit.cumulatedReception.toString(),
  ], expected.map((x) => String(x)),
  "[ createdAt, lastTransactionAt, lastEmissionAt, " +
  "lastReceptionAt, cumulatedEmission, cumulatedReception ]");
};

contract("AuditableToken", function (accounts) {
  let core, delegate, token, userRegistry, ratesProvider;

  describe("with a token and no audits", function () {
    beforeEach(async function () {
      delegate = await AuditableTokenDelegate.new();
      core = await TokenCoreMock.new("Test");
      await core.defineTokenDelegate(1, delegate.address, []);

      token = await TokenProxy.new(core.address);
      await core.defineToken(
        token.address, 1, NAME, SYMBOL, DECIMALS);
      await core.defineSupplyMock(token.address, AMOUNT);
      await token.approve(accounts[1], AMOUNT);
    });

    it("should have audit shared", async function () {
      const audit = await core.audit(
        token.address, 0, AUDIT_STORAGE_SHARED, "0x0");
      evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
    });

    it("should have token audit user", async function () {
      const userId = "0x" + "1".padStart(64, "0");
      const audit = await core.audit(
        token.address, 0, AUDIT_STORAGE_USER_ID, userId);
      evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
    });

    it("should have token audit address", async function () {
      const audit = await core.audit(
        token.address, 0, AUDIT_STORAGE_ADDRESS, accounts[1]);
      evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
    });

    describe("With a transfer", function () {
      beforeEach(async function () {
        await token.transfer(accounts[1], "3333");
      });

      it("should have token audit address for sender", async function () {
        const audit = await core.audit(
          token.address, 0, AUDIT_STORAGE_ADDRESS, accounts[0]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have token audit address for receiver", async function () {
        const audit = await core.audit(
          token.address, 0, AUDIT_STORAGE_ADDRESS, accounts[1]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });
    });

    describe("With a transferFrom", function () {
      beforeEach(async function () {
        await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
      });

      it("should have token audit address for sender", async function () {
        const audit = await core.audit(
          token.address, 0, AUDIT_STORAGE_ADDRESS, accounts[0]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have token audit address for sender", async function () {
        const audit = await core.audit(
          token.address, 0, AUDIT_STORAGE_ADDRESS, accounts[1]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have token audit address for receiver", async function () {
        const audit = await core.audit(
          token.address, 0, AUDIT_STORAGE_ADDRESS, accounts[2]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });
    });
  });

  describe("with a mocked delegate", function () {
    let block1Time, block2Time, block3Time;

    beforeEach(async function () {
      delegate = await AuditableTokenDelegate.new();
      core = await TokenCoreMock.new("Test");

      await core.defineTokenDelegate(1, delegate.address, [0]);

      userRegistry = await UserRegistryMock.new(
        [accounts[0], accounts[1], accounts[2]], CHF, [5, 5000000, 5000000]);
      ratesProvider = await RatesProviderMock.new();
      await core.defineOracle(userRegistry.address);
      
      token = await TokenProxy.new(core.address);
      await core.defineToken(
        token.address, 1, NAME, SYMBOL, DECIMALS);
      await core.defineSupplyMock(token.address, AMOUNT);
    });

    describe("and config 0 (Core scope 0, address storage, triggers only and all fields)", function () {
      beforeEach(async function () {
        const args = [0].concat(CONFIGURATIONS[0]);
        args[6] = ratesProvider.address;
        await core.defineAuditConfiguration(...args);

        await core.defineAuditTriggers(0, [accounts[1]], [true], [true], [false]);
        
        await token.transfer(accounts[1], "3333");
        block1Time = (await web3.eth.getBlock("latest")).timestamp;

        await token.transfer(accounts[2], "3333");
        block2Time = (await web3.eth.getBlock("latest")).timestamp;

        await token.transfer(accounts[0], "1234", { from: accounts[1] });
        block3Time = (await web3.eth.getBlock("latest")).timestamp;
      });

      it("should have core 0 shared data", async function () {
        const audit = await core.audit(
          core.address, 0, AUDIT_STORAGE_SHARED, "0x0");
        evalAudit(audit, [0, 0, 0, 0, 0, 0]);
      });

      it("should have core 0 user 1 data", async function () {
        const userId = "0x" + "1".padStart(64, "0");
        const audit = await core.audit(
          core.address, 0, AUDIT_STORAGE_USER_ID, userId);
        evalAudit(audit, [0, 0, 0, 0, 0, 0]);
      });

      it("should have core 0 user 2 data", async function () {
        const userId = "0x" + "2".padStart(64, "0");
        const audit = await core.audit(
          core.address, 0, AUDIT_STORAGE_USER_ID, userId);
        evalAudit(audit, [0, 0, 0, 0, 0, 0]);
      });

      it("should have core 0 user 3 data", async function () {
        const userId = "0x" + "3".padStart(64, "0");
        const audit = await core.audit(
          core.address, 0, AUDIT_STORAGE_USER_ID, userId);
        evalAudit(audit, [0, 0, 0, 0, 0, 0]);
      });

      it("should have core 0 address 0 data", async function () {
        const audit = await core.audit(
          core.address, 0, AUDIT_STORAGE_ADDRESS, accounts[0]);
        evalAudit(audit, [block1Time, block3Time, block1Time, block3Time, "4999", "1851"]);
      });

      it("should have core 0 address 1 data", async function () {
        const audit = await core.audit(
          core.address, 0, AUDIT_STORAGE_ADDRESS, accounts[1]);
        evalAudit(audit, [block1Time, block3Time, block3Time, block1Time, "1851", "4999"]);
      });

      it("should have core 0 address 2 data", async function () {
        const audit = await core.audit(
          core.address, 0, AUDIT_STORAGE_ADDRESS, accounts[2]);
        evalAudit(audit, [0, 0, 0, 0, 0, 0]);
      });
    });

    describe("and config 1 (Core scope 1, userId storage, triggers excluded and 2 fields)", function () {
      beforeEach(async function () {
        const args = [1].concat(CONFIGURATIONS[1]);
        args[6] = ratesProvider.address;
        await core.defineAuditConfiguration(...args);

        await core.defineTokenDelegate(1, delegate.address, [1]);

        await token.transfer(accounts[1], "3333");
        block1Time = (await web3.eth.getBlock("latest")).timestamp;

        await token.transfer(accounts[2], "3333");
        block2Time = (await web3.eth.getBlock("latest")).timestamp;

        await token.transfer(accounts[0], "1234", { from: accounts[1] });
        block3Time = (await web3.eth.getBlock("latest")).timestamp;
      });

      it("should have core 1 shared data", async function () {
        const audit = await core.audit(
          core.address, 1, AUDIT_STORAGE_SHARED, "0x0");
        evalAudit(audit, [0, 0, 0, 0, 0, 0]);
      });

      it("should have core 1 user 1 data", async function () {
        const userId = "0x" + "1".padStart(64, "0");
        const audit = await core.audit(
          core.address, 1, AUDIT_STORAGE_USER_ID, userId);
        evalAudit(audit, ["0", "0", block2Time, block3Time, "9998", "1851"]);
      });

      it("should have core 1 user 2 data", async function () {
        const userId = "0x" + "2".padStart(64, "0");
        const audit = await core.audit(
          core.address, 1, AUDIT_STORAGE_USER_ID, userId);
        evalAudit(audit, ["0", "0", block3Time, block1Time, "1851", "4999"]);
      });

      it("should have core 1 user 3 data", async function () {
        const userId = "0x" + "3".padStart(64, "0");
        const audit = await core.audit(
          core.address, 1, AUDIT_STORAGE_USER_ID, userId);
        evalAudit(audit, ["0", "0", "0", block2Time, "0", "4999"]);
      });

      it("should have core 1 address 0 data", async function () {
        const audit = await core.audit(
          core.address, 1, AUDIT_STORAGE_ADDRESS, accounts[0]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have core 1 address 1 data", async function () {
        const audit = await core.audit(
          core.address, 1, AUDIT_STORAGE_ADDRESS, accounts[1]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have core 1 address 2 data", async function () {
        const audit = await core.audit(
          core.address, 1, AUDIT_STORAGE_ADDRESS, accounts[2]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });
    });

    describe("and config 2 (Core scope 2, address storage, always and 2 fields)", function () {
      beforeEach(async function () {
        const args = [2].concat(CONFIGURATIONS[2]);
        args[6] = ratesProvider.address;
        await core.defineAuditConfiguration(...args);

        await core.defineAuditTriggers(2, [accounts[1], accounts[2]], [true, true], [true, true], [true, true]);
        await core.defineTokenDelegate(1, delegate.address, [2]);

        await token.transfer(accounts[1], "3333");
        block1Time = (await web3.eth.getBlock("latest")).timestamp;

        await token.transfer(accounts[2], "3333");
        block2Time = (await web3.eth.getBlock("latest")).timestamp;

        await token.transfer(accounts[0], "1234", { from: accounts[1] });
        block3Time = (await web3.eth.getBlock("latest")).timestamp;
      });

      it("should have core 2 shared data", async function () {
        const audit = await core.audit(
          core.address, 2, AUDIT_STORAGE_SHARED, "0x0");
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have core 2 user 1 data", async function () {
        const userId = "0x" + "1".padStart(64, "0");
        const audit = await core.audit(
          core.address, 2, AUDIT_STORAGE_USER_ID, userId);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have core 2 user 2 data", async function () {
        const userId = "0x" + "2".padStart(64, "0");
        const audit = await core.audit(
          core.address, 2, AUDIT_STORAGE_USER_ID, userId);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have core 2 user 3 data", async function () {
        const userId = "0x" + "3".padStart(64, "0");
        const audit = await core.audit(
          core.address, 2, AUDIT_STORAGE_USER_ID, userId);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have core 2 address 0 data", async function () {
        const audit = await core.audit(
          core.address, 2, AUDIT_STORAGE_ADDRESS, accounts[0]);
        evalAudit(audit, [block1Time, block3Time, "0", "0", "0", "0"]);
      });

      it("should have core 2 address 1 data", async function () {
        const audit = await core.audit(
          core.address, 2, AUDIT_STORAGE_ADDRESS, accounts[1]);
        evalAudit(audit, [block1Time, block3Time, "0", "0", "0", "0"]);
      });

      it("should have core 2 address 2 data", async function () {
        const audit = await core.audit(
          core.address, 2, AUDIT_STORAGE_ADDRESS, accounts[2]);
        evalAudit(audit, [block2Time, block2Time, "0", "0", "0", "0"]);
      });
    });

    describe("and config 3 (Token scope 0, shared storage, always and all fields)", function () {
      beforeEach(async function () {
        const args = [3].concat(CONFIGURATIONS[3]);
        args[6] = ratesProvider.address;
        await core.defineAuditConfiguration(...args);

        await core.defineTokenDelegate(1, delegate.address, [3]);
        await token.transfer(accounts[1], "3333");
        block1Time = (await web3.eth.getBlock("latest")).timestamp;

        await token.transfer(accounts[2], "3333");
        block2Time = (await web3.eth.getBlock("latest")).timestamp;

        await token.transfer(accounts[0], "1234", { from: accounts[1] });
        block3Time = (await web3.eth.getBlock("latest")).timestamp;
      });

      it("should have token 0 shared data", async function () {
        const audit = await core.audit(
          token.address, 0, AUDIT_STORAGE_SHARED, "0x0");
        evalAudit(audit, [block1Time, block3Time, block3Time, block3Time, "11849", "11849"]);
      });

      it("should have token 0 user 1 data", async function () {
        const userId = "0x" + "1".padStart(64, "0");
        const audit = await core.audit(
          token.address, 0, AUDIT_STORAGE_USER_ID, userId);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have token 0 user 2 data", async function () {
        const userId = "0x" + "2".padStart(64, "0");
        const audit = await core.audit(
          token.address, 0, AUDIT_STORAGE_USER_ID, userId);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have token 0 user 3 data", async function () {
        const userId = "0x" + "3".padStart(64, "0");
        const audit = await core.audit(
          token.address, 0, AUDIT_STORAGE_USER_ID, userId);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have token 0 address 0 data", async function () {
        const audit = await core.audit(
          token.address, 0, AUDIT_STORAGE_ADDRESS, accounts[0]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have token 0 address 1 data", async function () {
        const audit = await core.audit(
          token.address, 0, AUDIT_STORAGE_ADDRESS, accounts[1]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have token 0 address 2 data", async function () {
        const audit = await core.audit(
          token.address, 0, AUDIT_STORAGE_ADDRESS, accounts[2]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });
    });
  });

  describe("with a token and many audits", function () {
    beforeEach(async function () {
      delegate = await AuditableTokenDelegate.new();
      core = await TokenCoreMock.new("Test");
      await core.defineTokenDelegate(1, delegate.address, [0, 1, 2, 3]);

      token = await TokenProxy.new(core.address);
      await core.defineToken(
        token.address, 1, NAME, SYMBOL, DECIMALS);
      await core.defineSupplyMock(token.address, AMOUNT);
      await token.approve(accounts[1], AMOUNT);

      userRegistry = await UserRegistryMock.new(
        [accounts[0], accounts[1], accounts[2]], CHF, [5, 5000000, 5000000]);
      await core.defineOracle(userRegistry.address);

      ratesProvider = await RatesProviderMock.new();
      for (let i = 0; i < CONFIGURATIONS.length; i++) {
        const args = [i].concat(CONFIGURATIONS[i]);
        args[6] = ratesProvider.address;
        await core.defineAuditConfiguration(...args);
      }

      await core.defineAuditTriggers(0, [accounts[0]], [true], [false], [false]);
      // TODO test trigger excluded independently
      // await core.defineAuditTriggers(1, [ accounts[1] ], [ false ], [ true ], [ false ]);
    });

    describe("With a first transfer", function () {
      let block1Time;

      beforeEach(async function () {
        await token.transfer(accounts[1], "3333");
        block1Time = (await web3.eth.getBlock("latest")).timestamp;
      });

      it("should have token audit for shared", async function () {
        const audit = await core.audit(
          token.address, 0, AUDIT_STORAGE_SHARED, "0x0");
        evalAudit(audit, [block1Time, block1Time, block1Time, block1Time, "4999", "4999"]);
      });

      it("should have token audit for sender", async function () {
        const userId = "0x" + "1".padStart(64, "0");
        const audit = await core.audit(
          core.address, 1, AUDIT_STORAGE_USER_ID, userId);
        evalAudit(audit, [0, 0, block1Time, 0, "4999", 0]);
      });

      it("should have token audit for receiver", async function () {
        const userId = "0x" + "2".padStart(64, "0");
        const audit = await core.audit(
          core.address, 1, AUDIT_STORAGE_USER_ID, userId);
        evalAudit(audit, [0, 0, 0, block1Time, 0, "4999"]);
      });

      it("should have token audit for sender address", async function () {
        const audit = await core.audit(
          core.address, 2, AUDIT_STORAGE_ADDRESS, accounts[0]);
        evalAudit(audit, [block1Time, block1Time, 0, 0, 0, 0]);
      });

      it("should have token audit for receiver address", async function () {
        const audit = await core.audit(
          core.address, 2, AUDIT_STORAGE_ADDRESS, accounts[0]);
        evalAudit(audit, [block1Time, block1Time, 0, 0, 0, 0]);
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

      it("should have token audit for shared", async function () {
        const audit = await core.audit(
          token.address, 0, AUDIT_STORAGE_SHARED, "0x0");
        evalAudit(audit, [block1Time, block2Time, block2Time, block2Time, "9998", "9998"]);
      });

      it("should have token audit for sender", async function () {
        const userId = "0x" + "1".padStart(64, "0");
        const audit = await core.audit(
          core.address, 1, AUDIT_STORAGE_USER_ID, userId);
        evalAudit(audit, ["0", "0", block2Time, "0", "9998", "0"]);
      });

      it("should have token audit for receiver", async function () {
        const userId = "0x" + "2".padStart(64, "0");
        const audit = await core.audit(
          core.address, 1, AUDIT_STORAGE_USER_ID, userId);
        evalAudit(audit, ["0", "0", "0", block2Time, "0", "9998"]);
      });

      it("should have token audit for sender address", async function () {
        const audit = await core.audit(
          core.address, 2, AUDIT_STORAGE_ADDRESS, accounts[0]);
        evalAudit(audit, [block1Time, block2Time, "0", "0", "0", "0"]);
      });

      it("should have token audit for receiver address", async function () {
        const audit = await core.audit(
          core.address, 2, AUDIT_STORAGE_ADDRESS, accounts[0]);
        evalAudit(audit, [block1Time, block2Time, "0", "0", "0", "0"]);
      });
    });

    describe("With a first transferFrom", function () {
      let block1Time;

      beforeEach(async function () {
        await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
        block1Time = (await web3.eth.getBlock("latest")).timestamp;
      });

      it("should have token audit for shared", async function () {
        const audit = await core.audit(
          token.address, 0, AUDIT_STORAGE_SHARED, "0x0");
        evalAudit(audit, [block1Time, block1Time, block1Time, block1Time, "4999", "4999"]);
      });

      it("should have token audit for sender", async function () {
        const userId = "0x" + "1".padStart(64, "0");
        const audit = await core.audit(
          core.address, 1, AUDIT_STORAGE_USER_ID, userId);
        evalAudit(audit, ["0", "0", block1Time, "0", "4999", "0"]);
      });

      it("should have token audit for receiver", async function () {
        const userId = "0x" + "3".padStart(64, "0");
        const audit = await core.audit(
          core.address, 1, AUDIT_STORAGE_USER_ID, userId);
        evalAudit(audit, ["0", "0", "0", block1Time, "0", "4999"]);
      });

      it("should have token audit for sender address", async function () {
        const audit = await core.audit(
          core.address, 0, AUDIT_STORAGE_ADDRESS, accounts[0]);
        evalAudit(audit, [block1Time, block1Time, block1Time, "0", "4999", "0"]);
      });

      it("should have token audit for receiver address", async function () {
        const audit = await core.audit(
          core.address, 0, AUDIT_STORAGE_ADDRESS, accounts[2]);
        evalAudit(audit, [block1Time, block1Time, "0", block1Time, "0", "4999"]);
      });

      it("should have token audit for 'from'", async function () {
        const audit = await core.audit(
          core.address, 0, AUDIT_STORAGE_ADDRESS, accounts[0]);
        evalAudit(audit, [block1Time, block1Time, block1Time, "0", "4999", "0"]);
      });

      it("should have token audit for 'to'", async function () {
        const audit = await core.audit(
          core.address, 0, AUDIT_STORAGE_ADDRESS, accounts[2]);
        evalAudit(audit, [block1Time, block1Time, "0", block1Time, "0", "4999"]);
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
        const audit = await core.audit(
          core.address, 0, AUDIT_STORAGE_ADDRESS, accounts[1]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have token audit for 'from'", async function () {
        const audit = await core.audit(
          core.address, 0, AUDIT_STORAGE_ADDRESS, accounts[0]);
        evalAudit(audit, [block1Time, block2Time, block2Time, "0", "9998", "0"]);
      });

      it("should have token audit for 'to'", async function () {
        const audit = await core.audit(
          core.address, 0, AUDIT_STORAGE_ADDRESS, accounts[2]);
        evalAudit(audit, [block1Time, block2Time, "0", block2Time, "0", "9998"]);
      });
    });
  });
});
