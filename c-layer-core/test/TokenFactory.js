"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("./helpers/assertRevert");
const TokenFactory = artifacts.require("TokenFactory.sol");
const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCore = artifacts.require("TokenCore.sol");
const TokenDelegate = artifacts.require("TokenDelegate.sol");

const NULL_ADDRESS = "0x".padEnd(42, "0");
const NAME = "Token", SYMBOL = "TKN", DECIMALS = 18;

const CONFIG1 = web3.utils.toHex("Configuration1").padEnd(66, "0");
const CONFIG2 = web3.utils.toHex("Configuration2").padEnd(66, "0");

contract("TokenFactory", function (accounts) {
  let factory, core, delegate, postInstall;

  beforeEach(async function () {
    factory = await TokenFactory.new("Test Factory");
    delegate = await TokenDelegate.new();
    core = await TokenCore.new("Test", [ delegate.address ]);
  });

  it("should have a name", async function () {
    let name = await factory.name();
    assert.equal(name, "Test Factory", "name"); 
  });

  it("should not have any proxy count", async function () {
    let proxyCount = await factory.proxyCount();
    assert.equal(proxyCount.toString(), 0, "no proxy");
  });

  it("should prevent non operator to add a configuration", async function() {
    await assertRevert(factory.addConfiguration(CONFIG1, TokenProxy.bytecode, [ delegate.address ], { from: accounts[1] }), "OP01");
  });

  it("should prevent operator to add a configuration without code", async function() {
    await assertRevert(factory.addConfiguration(CONFIG1, "0x", [ delegate.address ]), "TF02");
  });

  it("should prevent operator to add a configuration with no delegate", async function() {
    await assertRevert(factory.addConfiguration(CONFIG1, TokenProxy.bytecode, []), "TF03");
  });

  it("should let operator to add a configuration", async function() {
    let tx = await factory.addConfiguration(CONFIG1, TokenProxy.bytecode, [ delegate.address ]);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "ConfigurationAdded", "event");
    assert.equal(tx.logs[0].args.configuration, CONFIG1, "configuration");
  });

  it("should prevent operator to remove a non existing configuration", async function () {
    await assertRevert(factory.removeConfiguration(CONFIG1), "TF04");
  });

  describe("With a configuration", function () {

    beforeEach(async function () {
      await factory.addConfiguration(CONFIG1, TokenProxy.bytecode, [ delegate.address ]);
    });

    it("should have delegates for the configuration", async function () {
      const delegates = await factory.delegates(CONFIG1);
      assert.deepEqual(delegates, [ delegate.address ], "delegates");
    });

    it("should have a code hash for the configuration", async function () {
      const codeHash = await factory.codeHash(CONFIG1);
      assert.equal(codeHash, web3.utils.sha3(TokenProxy.bytecode), "codeHash");
    });

    it("should prevent non operator to remove the configuration", async function () {
      await assertRevert(factory.removeConfiguration(CONFIG1, { from: accounts[1] }), "OP01");
    });

    it("should let operator to remove the configuration", async function () {
      let tx = await factory.removeConfiguration(CONFIG1);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1, "logs");
      assert.equal(tx.logs[0].event, "ConfigurationRemoved", "event");
      assert.equal(tx.logs[0].args.configuration, CONFIG1, "configuration");
    });

    it("should prevent to create a proxy with no configuration", async function () {
      await assertRevert(factory.createProxy(CONFIG2));
    });

    it("should create a proxy", async function () {
      let tx = await factory.createProxy(CONFIG1, core.address);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1, "logs");
      assert.equal(tx.logs[0].event, "ProxyCreated", "event");
      let proxyAddress = tx.logs[0].args.proxy;
      assert.equal(proxyAddress.length, 42, "proxy address length");
      assert.equal(proxyAddress.substr(0,2), "0x", "proxy starts with 0x");
      assert.ok(proxyAddress != NULL_ADDRESS, "proxy address exists");
      assert.equal(tx.logs[0].args.core, core.address, "core");
      assert.equal(tx.logs[0].args.configuration, CONFIG1, "configuration");
    });

    describe("With a proxy created", function () {
      let proxy;

      beforeEach(async function () {
        let tx = await factory.createProxy(CONFIG1, core.address);
        let proxyAddress = tx.logs[0].args.proxy;

        proxy = await TokenProxy.at(proxyAddress);
        await core.defineToken(proxyAddress, 0, NAME, SYMBOL, DECIMALS);
      });

      it("should have a core", async function () {
        const coreAddress = await proxy.core();
        assert.equal(coreAddress, core.address, "core");
      });

      it("should have a name", async function () {
        const name = await proxy.name();
        assert.equal(name, NAME, "name");
      });

      it("should have a symbol", async function () {
        const symbol = await proxy.symbol();
        assert.equal(symbol, SYMBOL, "symbol");
      });

      it("should have decimals", async function () {
        const decimals = await proxy.decimals();
        assert.equal(decimals.toString(), DECIMALS, "decimals");
      });
    });
  });
});
