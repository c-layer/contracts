"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("./helpers/assertRevert");
const assertThrow = require("./helpers/assertThrow");
const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCore = artifacts.require("TokenCore.sol");
const TokenDelegate = artifacts.require("TokenDelegate.sol");
const UserRegistryMock = artifacts.require("UserRegistryMock.sol");
const RatesProviderMock = artifacts.require("RatesProviderMock.sol");

const NULL_ADDRESS = "0x".padEnd(42, "0");
const EMPTY_BYTES = "0x".padEnd(66, "0");
const NAME = "Token";
const SYMBOL = "TKN";
const DECIMALS = 18;
const CHF = web3.utils.toHex("CHF").padEnd(66, "0");
const TKN = web3.utils.toHex("TKN").padEnd(66, "0");
const AUDIT_MODE_TRIGGERS_ONLY = 1;
const AUDIT_MODE_ALWAYS = 3;

contract("TokenCore", function (accounts) {
  let token, core, delegate, userRegistry, ratesProvider;

  beforeEach(async function () {
    delegate = await TokenDelegate.new();
    core = await TokenCore.new("Test");
    userRegistry = await UserRegistryMock.new(
      [accounts[0], accounts[1], accounts[2]], CHF, [5, 5000000]);
    ratesProvider = await RatesProviderMock.new();
  });

  it("should have a name", async function () {
    const name = await core.name();
    assert.equal(name, "Test", "name");
  });

  it("should have no oracles", async function () {
    const oracles = await core.oracles();
    assert.equal(oracles[0], NULL_ADDRESS, "user registry");
    assert.equal(oracles[1], NULL_ADDRESS, "ratesProvider");
    assert.equal(oracles[2], EMPTY_BYTES, "currency");
    assert.equal(oracles[3].length, 0, "keys");
  });

  it("should have no token delegates", async function () {
    const delegateAddress = await core.delegates(0);
    assert.equal(delegateAddress, NULL_ADDRESS, "no delegate addresses");
  });

  it("should define token delegate with configurations", async function () {
    const tx = await core.defineTokenDelegate(0, delegate.address, [ 1, 2, 3 ]);
    
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "TokenDelegateDefined", "event");
    assert.equal(tx.logs[0].args.delegateId, 0, "delegateId");
    assert.equal(tx.logs[0].args.delegate, delegate.address, "delegate");
    assert.deepEqual(tx.logs[0].args.configurations.map((x) => x.toString()), [ "1", "2", "3" ], "configurations");
  });

  it("should let define oracles", async function () {
    const tx = await core.defineOracles(userRegistry.address, ratesProvider.address, [0, 1]);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "OraclesDefined", "event");
    assert.equal(tx.logs[0].args.userRegistry, userRegistry.address, "user registry");
    assert.equal(tx.logs[0].args.ratesProvider, ratesProvider.address, "rates provider");
    assert.equal(tx.logs[0].args.currency.toString(), CHF, "currency");
    assert.deepEqual(tx.logs[0].args.userKeys.map((x) => x.toString()), ["0", "1"], "keys");
  });

  describe("With oracles defined", async function () {
    beforeEach(async function () {
      await core.defineOracles(userRegistry.address, ratesProvider.address, [0, 1]);
    });

    it("should let define a user registry with the samet currency", async function () {
      userRegistry = await UserRegistryMock.new(
        [accounts[0], accounts[1], accounts[2]], CHF, [5, 5000000]);
      const tx = await core.defineOracles(userRegistry.address, ratesProvider.address, [0, 1]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "OraclesDefined", "event");
      assert.equal(tx.logs[0].args.userRegistry, userRegistry.address, "user registry");
      assert.equal(tx.logs[0].args.ratesProvider, ratesProvider.address, "rates provider");
      assert.equal(tx.logs[0].args.currency.toString(), CHF, "currency");
      assert.deepEqual(tx.logs[0].args.userKeys.map((x) => x.toString()), ["0", "1"], "keys");
    });

    it("should not let define a user registry with a different currency", async function () {
      userRegistry = await UserRegistryMock.new(
        [accounts[0], accounts[1], accounts[2]], TKN, [5, 5000000]);
      await assertRevert(core.defineOracles(userRegistry.address, ratesProvider.address, [0, 1]), "TC02");
    });

    it("should have oracles", async function () {
      const oracles = await core.oracles();

      assert.equal(oracles[0], userRegistry.address, "user registry");
      assert.equal(oracles[1], ratesProvider.address, "ratesProvider");
      assert.equal(oracles[2], CHF, "currency");
      assert.deepEqual(oracles[3].map((x) => x.toString()), ["0", "1"], "keys");
    });
  });

  it("should define audit configuration", async function () {
    const tx = await core.defineAuditConfiguration(
      2, AUDIT_MODE_TRIGGERS_ONLY, 3, true,
      [ true, false, false ],
      [ true, true, true, true, true, true ]);

    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "AuditConfigurationDefined", "event");
    assert.equal(tx.logs[0].args.configurationId, 2, "configurationId");
    assert.equal(tx.logs[0].args.scopeId, 3, "scopeId");
    assert.equal(tx.logs[0].args.scopeCore, true, "scopeCore");
    assert.equal(tx.logs[0].args.mode, AUDIT_MODE_TRIGGERS_ONLY, "mode");
  });

  it("should define audit triggers", async function () {
    const tx = await core.defineAuditTriggers(
      2, [ accounts[1], accounts[2], accounts[3] ],
      [ true, false, false ],
      [ false, true, false ],
      [ false, false, true ]);

    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "AuditTriggersDefined", "event");
    assert.equal(tx.logs[0].args.configurationId, 2, "configurationId");
    assert.deepEqual(tx.logs[0].args.triggers, [ accounts[1], accounts[2], accounts[3] ], "triggers");
    assert.deepEqual(tx.logs[0].args.senders, [ true, false, false ], "senders");
    assert.deepEqual(tx.logs[0].args.receivers, [ false, true, false ], "receivers");
    assert.deepEqual(tx.logs[0].args.tokens, [ false, false, true ], "tokens");
  });

  it("should be self managed for a user", async function () {
    const selfManaged = await core.isSelfManaged(accounts[1]);
    assert.ok(!selfManaged, "User should not be selfManaged");
  });

  it("should let user self managed their wallet", async function () {
    const tx = await core.manageSelf(true, { from: accounts[1] });
    
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "SelfManaged", "event");
    assert.equal(tx.logs[0].args.holder, accounts[1], "holder");
    assert.equal(tx.logs[0].args.active, true, "active");

    const selfManaged = await core.isSelfManaged(accounts[1]);
    assert.ok(selfManaged, "User should be selfManaged");
  });

  describe("with a delegate defined", async function () {
    beforeEach(async function () {
      await core.defineAuditConfiguration(
        2, AUDIT_MODE_TRIGGERS_ONLY, 3, true,
        [ true, false, false ],
        [ true, true, true, true, true, true ]);
      const tx = await core.defineAuditTriggers(
        2, [ accounts[1], accounts[2], accounts[3] ],
        [ true, false, false ],
        [ false, true, false ],
        [ false, false, true ]);
      await core.defineTokenDelegate(1, delegate.address, [ 2 ]);
    });

    it("should have an audit configuration", async function () {
      const configuration = await core.auditConfiguration(2);
      assert.equal(configuration.mode, AUDIT_MODE_TRIGGERS_ONLY, "audit mode");
      assert.equal(configuration.scopeId, 3, "scope id");
      assert.equal(configuration.scopeCore, true, "scope core");
      assert.equal(configuration.sharedData, true, "sharedData");
      assert.equal(configuration.userData, false, "userData");
      assert.equal(configuration.addressData, false, "addressData");
      assert.equal(configuration.fieldCreatedAt, true, "createdAt");
      assert.equal(configuration.fieldLastTransactionAt, true, "lastTransactionAt");
      assert.equal(configuration.fieldLastEmissionAt, true, "lastEmissionAt");
      assert.equal(configuration.fieldLastReceptionAt, true, "lastReceptionAt");
      assert.equal(configuration.fieldCumulatedEmission, true, "cumulatedEmission");
      assert.equal(configuration.fieldCumulatedReception, true, "cumulatedReception");
    });

    it("should have audit triggers", async function () {
      const triggers = await core.auditTriggers(2, [ accounts[1], accounts[2], accounts[3] ]);
      assert.deepEqual(triggers.senders, [ true, false, false ], "senders");
      assert.deepEqual(triggers.receivers, [ false, true, false ], "receivers");
      assert.deepEqual(triggers.tokens, [ false, false, true ], "tokens");
    });

    it("should have a delegate", async function () {
      const delegate0 = await core.delegates(1);
      assert.equal(delegate0, delegate.address, "delegate 0");
    });

    it("should let remove a delegate", async function () {
      const tx = await core.defineTokenDelegate(1, NULL_ADDRESS, []);
      
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "TokenDelegateRemoved", "event");
      assert.equal(tx.logs[0].args.delegateId, 1, "delegateId");
    });

    it("should let define a token", async function () {
      token = await TokenProxy.new(core.address);
      const tx = await core.defineToken(
        token.address, 1, NAME, SYMBOL, DECIMALS);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1, "logs");
      assert.equal(tx.logs[0].event, "TokenDefined", "event");
      assert.equal(tx.logs[0].args.token, token.address, "token");
      assert.equal(tx.logs[0].args.delegateId, 1, "delegateId");
      assert.equal(tx.logs[0].args.name, NAME, "name");
      assert.equal(tx.logs[0].args.symbol, SYMBOL, "symbol");
      assert.equal(tx.logs[0].args.decimals, DECIMALS, "decimals");
    });

    describe("With a token defined", function () {
      let token;

      beforeEach(async function () {
        token = await TokenProxy.new(core.address);
        await core.defineToken(
          token.address, 1, NAME, SYMBOL, DECIMALS);
      });

      it("should let remove token", async function () {
        const tx = await core.removeToken(token.address);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, "TokenRemoved", "event");
        assert.equal(tx.logs[0].args.token, token.address, "token");
      });

      describe("With the token removed", function () {
        beforeEach(async function () {
          await core.removeToken(token.address);
        });

        it("Should have no delegates", async function () {
          const delegate = await core.proxyDelegates(token.address);
          assert.equal(delegate, 0, "no delegates");
        });

        it("should have no name", async function () {
          const name = await token.name();
          assert.equal(name, "", "no names");
        });

        it("should have no symbol", async function () {
          const symbol = await token.symbol();
          assert.equal(symbol, "", "no symbol");
        });

        it("should have no decimals", async function () {
          const decimals = await token.decimals();
          assert.equal(decimals, "0", "no decimals");
        });

        it("should have no supply", async function () {
          const supply = await token.totalSupply();
          assert.equal(supply, "0", "no supplies");
        });
      });
    });
  });
});
