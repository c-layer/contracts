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
const AUDIT_TRIGGERS_ONLY = 1;
const AUDIT_TRIGGERS_EXCLUDED = 2;
const AUDIT_ALWAYS = 3;
const AUDIT_NEVER = 0;

const CONFIGURATIONS = [ [
    AUDIT_TRIGGERS_ONLY, 0, true, // scopes
    [ true, true, true ], // datas
    [ true, true, true, true, true, true ] // fields
  ], [
    AUDIT_TRIGGERS_EXCLUDED, 1, true, // scopes
    [ true, false, false ], // datas
    [ false, false, true, false, true, false ] // fields
  ], [
    AUDIT_ALWAYS, 2, true, // scopes
    [ false, false, true ],
    [ true, true, false, false, false, false ] // fields
  ], [
    AUDIT_ALWAYS, 0, false, // scopes
    [ true, false, true ], // datas
    [ true, true, true, true, true, true ] //fields
  ]
];

const evalAudit = function (audit, expected) {
  assert.deepEqual([
    audit.createdAt.toString(),
    audit.lastTransactionAt.toString(),
    audit.lastEmissionAt.toString(),
    audit.lastReceptionAt.toString(),
    audit.cumulatedEmission.toString(),
    audit.cumulatedReception.toString()
  ], expected.map((x) => String(x)), "[ createdAt, lastTransactionAt, lastEmissionAt, lastReceptionAt, cumulatedEmission, cumulatedReception ]");
};

contract("AuditableToken", function (accounts) {
  let core, delegate, token, userRegistry, ratesProvider;

  describe("with a token and no audits", function () {
    beforeEach(async function () {
      delegate = await AuditableTokenDelegate.new();
      core = await TokenCoreMock.new("Test");
      await core.defineTokenDelegate(0, delegate.address, []);

      token = await TokenProxy.new(core.address);
      await core.defineToken(
        token.address, 0, NAME, SYMBOL, DECIMALS);
      await core.defineSupplyMock(token.address, AMOUNT);
      await token.approve(accounts[1], AMOUNT);
    });

    it("should have audit shared", async function () {
      const audit = await core.auditShared(token.address, 0);
      evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
    });

    it("should have token audit user", async function () {
      const audit = await core.auditUser(token.address, 0, 0);
      evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
    });

    it("should have token audit address", async function () {
      const audit = await core.auditAddress(token.address, 0, accounts[1]);
      evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
    });

    describe("With a transfer", function () {
      beforeEach(async function () {
        await token.transfer(accounts[1], "3333");
      });

      it("should have token audit address for sender", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[0]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have token audit address for receiver", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[1]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });
    });

    describe("With a transferFrom", function () {
      beforeEach(async function () {
        await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
      });

      it("should have token audit address for sender", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[0]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have token audit address for sender", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[1]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have token audit address for receiver", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[2]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });
    });
  });

  describe("with a mocked delegate", function () {
    let block1Time, block2Time, block3Time;

    beforeEach(async function () {
      delegate = await AuditableTokenDelegate.new();
      core = await TokenCoreMock.new("Test");

      userRegistry = await UserRegistryMock.new(
        [accounts[0], accounts[1], accounts[2]], CHF, [5, 5000000]);
      ratesProvider = await RatesProviderMock.new();
      await core.defineOracles(userRegistry.address, ratesProvider.address, [0, 1]);
      
      await core.defineTokenDelegate(0, delegate.address, [ ]);
      token = await TokenProxy.new(core.address);
      await core.defineToken(
        token.address, 0, NAME, SYMBOL, DECIMALS);
      await core.defineSupplyMock(token.address, AMOUNT);
    });

    describe("and config 0 (Core scope 0, all datas, triggers only and all fields)", function () {
      beforeEach(async function () {
        let args = [ 0 ].concat(CONFIGURATIONS[0]);
        await core.defineAuditConfiguration(...args);

        await core.defineAuditTriggers(0, [ accounts[1] ], [ true ], [ true ], [ false ]);
        await core.defineTokenDelegate(0, delegate.address, [ 0 ]);
        
        await token.transfer(accounts[1], "3333");
        block1Time = (await web3.eth.getBlock("latest")).timestamp;

        await token.transfer(accounts[2], "3333");
        block2Time = (await web3.eth.getBlock("latest")).timestamp;

        await token.transfer(accounts[0], "1234", { from: accounts[1] });
        block3Time = (await web3.eth.getBlock("latest")).timestamp;
      });

      it("should have core 0 shared data", async function () {
        const audit = await core.auditShared(core.address, 0);
        evalAudit(audit, [block1Time, block3Time, block3Time, block3Time, "6850", "6850"]);
      });

      it("should have core 0 user 1 data", async function () {
        const audit = await core.auditUser(core.address, 0, 1);
        evalAudit(audit, [block1Time, block3Time, block1Time, block3Time, "4999", "1851"]);
      });

      it("should have core 0 user 2 data", async function () {
        const audit = await core.auditUser(core.address, 0, 2);
        evalAudit(audit, [block1Time, block3Time, block3Time, block1Time, "1851", "4999"]);
      });

      it("should have core 0 user 3 data", async function () {
        const audit = await core.auditUser(core.address, 0, 3);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have core 0 address 0 data", async function () {
        const audit = await core.auditAddress(core.address, 0, accounts[0]);
        evalAudit(audit, [block1Time, block3Time, block1Time, block3Time, "4999", "1851"]);
      });

      it("should have core 0 address 1 data", async function () {
        const audit = await core.auditAddress(core.address, 0, accounts[1]);
        evalAudit(audit, [block1Time, block3Time, block3Time, block1Time, "1851", "4999"]);
      });

      it("should have core 0 address 2 data", async function () {
        const audit = await core.auditAddress(core.address, 0, accounts[2]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });
   });

   describe("and config 1 (Core scope 1, shared data, triggers excluded and 2 fields)", function () {
      beforeEach(async function () {
        let args = [ 1 ].concat(CONFIGURATIONS[1]);
        await core.defineAuditConfiguration(...args);

        await core.defineAuditTriggers(1, [ accounts[2] ], [ false ], [ true ], [ false ]);
        await core.defineTokenDelegate(0, delegate.address, [ 1 ]);

        await token.transfer(accounts[1], "3333");
        block1Time = (await web3.eth.getBlock("latest")).timestamp;

        await token.transfer(accounts[2], "3333");
        block2Time = (await web3.eth.getBlock("latest")).timestamp;

        await token.transfer(accounts[0], "1234", { from: accounts[1] });
        block3Time = (await web3.eth.getBlock("latest")).timestamp;
      });

      it("should have core 1 shared data", async function () {
        const audit = await core.auditShared(core.address, 1);
        evalAudit(audit, ["0", "0", block3Time, "0", "6850", "0"]);
      });

      it("should have core 1 user 1 data", async function () {
        const audit = await core.auditUser(core.address, 1, 1);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have core 1 user 2 data", async function () {
        const audit = await core.auditUser(core.address, 1, 2);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have core 1 user 3 data", async function () {
        const audit = await core.auditUser(core.address, 1, 3);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have core 1 address 0 data", async function () {
        const audit = await core.auditAddress(core.address, 1, accounts[0]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have core 1 address 1 data", async function () {
        const audit = await core.auditAddress(core.address, 1, accounts[1]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have core 1 address 2 data", async function () {
        const audit = await core.auditAddress(core.address, 1, accounts[2]);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });
    });

    describe("and config 2 (Core scope 2, address data, always and 2 fields)", function () {
      beforeEach(async function () {
        let args = [ 2 ].concat(CONFIGURATIONS[2]);
        await core.defineAuditConfiguration(...args);

        await core.defineAuditTriggers(2, [ accounts[1], accounts[2] ], [ true, true ], [ true, true ], [ true, true ]);
        await core.defineTokenDelegate(0, delegate.address, [ 2 ]);

        await token.transfer(accounts[1], "3333");
        block1Time = (await web3.eth.getBlock("latest")).timestamp;

        await token.transfer(accounts[2], "3333");
        block2Time = (await web3.eth.getBlock("latest")).timestamp;

        await token.transfer(accounts[0], "1234", { from: accounts[1] });
        block3Time = (await web3.eth.getBlock("latest")).timestamp;
      });

      it("should have core 2 shared data", async function () {
        const audit = await core.auditShared(core.address, 2);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have core 2 user 1 data", async function () {
        const audit = await core.auditUser(core.address, 2, 1);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have core 2 user 2 data", async function () {
        const audit = await core.auditUser(core.address, 2, 2);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have core 2 user 3 data", async function () {
        const audit = await core.auditUser(core.address, 2, 3);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have core 2 address 0 data", async function () {
        const audit = await core.auditAddress(core.address, 2, accounts[0]);
        evalAudit(audit, [block1Time, block3Time, "0", "0", "0", "0"]);
      });

      it("should have core 2 address 1 data", async function () {
        const audit = await core.auditAddress(core.address, 2, accounts[1]);
        evalAudit(audit, [block1Time, block3Time, "0", "0", "0", "0"]);
      });

      it("should have core 2 address 2 data", async function () {
        const audit = await core.auditAddress(core.address, 2, accounts[2]);
        evalAudit(audit, [block2Time, block2Time, "0", "0", "0", "0"]);
      });
    });

    describe("and config 3 (Token scope 0, shared and address datas, always and all fields)", function () {
      beforeEach(async function () {
        let args = [ 3 ].concat(CONFIGURATIONS[3]);
        await core.defineAuditConfiguration(...args);

        await core.defineTokenDelegate(0, delegate.address, [ 3 ]);
        await token.transfer(accounts[1], "3333");
        block1Time = (await web3.eth.getBlock("latest")).timestamp;

        await token.transfer(accounts[2], "3333");
        block2Time = (await web3.eth.getBlock("latest")).timestamp;

        await token.transfer(accounts[0], "1234", { from: accounts[1] });
        block3Time = (await web3.eth.getBlock("latest")).timestamp;
      });

      it("should have token 0 shared data", async function () {
        const audit = await core.auditShared(token.address, 0);
        evalAudit(audit, [block1Time, block3Time, block3Time, block3Time, "7900", "7900"]);
      });

      it("should have token 0 user 1 data", async function () {
        const audit = await core.auditUser(token.address, 0, 1);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have token 0 user 2 data", async function () {
        const audit = await core.auditUser(token.address, 0, 2);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have token 0 user 3 data", async function () {
        const audit = await core.auditUser(token.address, 0, 3);
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have token 0 address 0 data", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[0]);
        evalAudit(audit, [block1Time, block3Time, block2Time, block3Time, "6666", "1234"]);
      });

      it("should have token 0 address 1 data", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[1]);
        evalAudit(audit, [block1Time, block3Time, block3Time, block1Time, "1234", "3333"]);
      });

      it("should have token 0 address 2 data", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[2]);
        evalAudit(audit, [block2Time, block2Time, "0", block2Time, "0", "3333" ]);
      });
    });
  });

  describe("with a token and many audits", function () {
    beforeEach(async function () {
      delegate = await AuditableTokenDelegate.new();
      core = await TokenCoreMock.new("Test");
      await core.defineTokenDelegate(0, delegate.address, [ 0, 1, 2, 3 ]);

      for(let i=0; i < CONFIGURATIONS.length; i++) {
        let args = [ i ].concat(CONFIGURATIONS[i]);
        await core.defineAuditConfiguration(...args);
      }

      token = await TokenProxy.new(core.address);
      await core.defineToken(
        token.address, 0, NAME, SYMBOL, DECIMALS);
      await core.defineSupplyMock(token.address, AMOUNT);
      await token.approve(accounts[1], AMOUNT);

      userRegistry = await UserRegistryMock.new(
        [accounts[0], accounts[1], accounts[2]], CHF, [5, 5000000]);
      ratesProvider = await RatesProviderMock.new();
      await core.defineOracles(userRegistry.address, ratesProvider.address, [0, 1]);
    });

    describe("With a first transfer", function () {
      let block1Time;

      beforeEach(async function () {
        await token.transfer(accounts[1], "3333");
        block1Time = (await web3.eth.getBlock("latest")).timestamp;
      });

      it("should have token audit for sender address", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[0]);
        evalAudit(audit, [block1Time, block1Time, block1Time, "0", "3333", "0"]);
      });

      it("should have token audit for receiver", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[1]);
        evalAudit(audit, [block1Time, block1Time, "0", block1Time, "0", "3333"]);
      });

      it("should have token audit for sender address", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[0]);
        evalAudit(audit, [block1Time, block1Time, block1Time, "0", "3333", "0"]);
      });

      it("should have token audit for receiver", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[1]);
        evalAudit(audit, [block1Time, block1Time, "0", block1Time, "0", "3333"]);
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
        evalAudit(audit, [block1Time, block2Time, block2Time, "0", "6666", "0"]);
      });

      it("should have token audit for receiver", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[1]);
        evalAudit(audit, [block1Time, block2Time, "0", block2Time, "0", "6666"]);
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
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have token audit for 'from'", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[0]);
        evalAudit(audit, [block1Time, block1Time, block1Time, "0", "3333", "0"]);
      });

      it("should have token audit for 'to'", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[2]);
        evalAudit(audit, [block1Time, block1Time, "0", block1Time, "0", "3333"]);
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
        evalAudit(audit, ["0", "0", "0", "0", "0", "0"]);
      });

      it("should have token audit for 'from'", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[0]);
        evalAudit(audit, [block1Time, block2Time, block2Time, "0", "6666", "0"]);
      });

      it("should have token audit for 'to'", async function () {
        const audit = await core.auditAddress(token.address, 0, accounts[2]);
        evalAudit(audit, [block1Time, block2Time, "0", block2Time, "0", "6666"]);
      });
    });
  });
});
