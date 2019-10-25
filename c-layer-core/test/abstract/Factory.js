"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const FactoryMock = artifacts.require("FactoryMock.sol");
const ProxyMock = artifacts.require("ProxyMock.sol");

const NULL_ADDRESS = "0x".padEnd(42, "0");

contract("Factory", function (accounts) {
  const CORE_ADDRESS = accounts[1];
  const CORE_PARAMETER = CORE_ADDRESS.substr(2).padStart(64, "0").toLowerCase();

  let proxyCode, proxyCodeHash;
  let factory;

  beforeEach(async function () {
    factory = await FactoryMock.new();
    proxyCode = ProxyMock.bytecode;
    proxyCodeHash = web3.utils.sha3(proxyCode);
  });

  it("should have no proxy code", async function () {
    const proxyCodeFound = await factory.proxyCode();
    assert.equal(proxyCodeFound, null, "no proxy code");
  });

  it("should define a proxy code", async function () {
    const tx = await factory.defineProxyCode(CORE_ADDRESS, proxyCode);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "ProxyCodeDefined", "event");
    assert.equal(tx.logs[0].args.codeHash, proxyCodeHash, "proxy codeHash");
  });

  describe("With proxy code defined", function () {
    beforeEach(async function () {
      await factory.defineProxyCode(CORE_ADDRESS, proxyCode);
    });

    it("should have a proxy code", async function () {
      const proxyCodeFound = await factory.proxyCode();
      assert.equal(proxyCodeFound, proxyCode + CORE_PARAMETER, "proxy code");
    });

    it("should let deploy a proxy", async function () {
      const tx = await factory.deployProxy();
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "ProxyDeployed", "event");
      assert.equal(tx.logs[0].args.proxy.length, 42, "proxy address length");
      assert.ok(tx.logs[0].args.proxy !== NULL_ADDRESS, "proxy address not null");
    });

    describe("With a proxy deployed", function () {
      let proxy, proxyAddress;

      beforeEach(async function () {
        const tx = await factory.deployProxy();
        proxyAddress = tx.logs[0].args.proxy;
        proxy = await ProxyMock.at(proxyAddress);
      });

      it("should have a proxy with a core", async function () {
        const core = await proxy.core();
        assert.equal(core, CORE_ADDRESS, "core address");
      });
    });
  });
});
