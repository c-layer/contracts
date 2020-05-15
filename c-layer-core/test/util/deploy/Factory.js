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

  const TOKEN_PROXY_ID = 0;

  let proxyCode, proxyCodeHash;
  let factory;

  beforeEach(async function () {
    factory = await FactoryMock.new();
    proxyCode = ProxyMock.bytecode;
    proxyCodeHash = web3.utils.sha3(proxyCode);
  });

  it("should have no proxy code", async function () {
    const proxyCodeFound = await factory.contractCode(TOKEN_PROXY_ID);
    assert.equal(proxyCodeFound, null, "no proxy code");
  });

  it("should define a proxy code", async function () {
    const tx = await factory.defineProxyCode(TOKEN_PROXY_ID, CORE_ADDRESS, proxyCode);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "ContractCodeDefined", "event");
    assert.equal(tx.logs[0].args.codeHash, proxyCodeHash, "proxy codeHash");
  });

  describe("With proxy code defined", function () {
    beforeEach(async function () {
      await factory.defineProxyCode(TOKEN_PROXY_ID, CORE_ADDRESS, proxyCode);
    });

    it("should have a proxy code", async function () {
      const proxyCodeFound = await factory.contractCode(TOKEN_PROXY_ID);
      assert.equal(proxyCodeFound, proxyCode + CORE_PARAMETER, "proxy code");
    });

    it("should let deploy a proxy", async function () {
      const tx = await factory.deployContractId(TOKEN_PROXY_ID);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "ContractDeployed", "event");
      assert.equal(tx.logs[0].args.address_.length, 42, "proxy address length");
      assert.ok(tx.logs[0].args.address_ !== NULL_ADDRESS, "proxy address not null");
    });

    it("should let deploy a contract", async function () {
      const tx = await factory.deployContract(proxyCode + CORE_PARAMETER);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "ContractDeployed", "event");
      assert.equal(tx.logs[0].args.address_.length, 42, "proxy address length");
      assert.ok(tx.logs[0].args.address_ !== NULL_ADDRESS, "proxy address not null");
    });

    describe("With a proxy deployed", function () {
      let proxy, proxyAddress;

      beforeEach(async function () {
        const tx = await factory.deployContractId(TOKEN_PROXY_ID);
        proxyAddress = tx.logs[0].args.address_;
        proxy = await ProxyMock.at(proxyAddress);
      });

      it("should have a proxy with a core", async function () {
        const core = await proxy.core();
        assert.equal(core, CORE_ADDRESS, "core address");
      });
    });

    describe("With a contract deployed", function () {
      let contract, contractAddress;

      beforeEach(async function () {
        const tx = await factory.deployContract(proxyCode + CORE_PARAMETER);
        contractAddress = tx.logs[0].args.address_;
        contract = await ProxyMock.at(contractAddress);
      });

      it("should have a contract with initialized", async function () {
        const core = await contract.core();
        assert.equal(core, CORE_ADDRESS, "core address");
      });
    });
  });
});
