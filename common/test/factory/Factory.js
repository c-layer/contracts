"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const FactoryMock = artifacts.require("FactoryMock.sol");
const ProxyMock = artifacts.require("ProxyMock.sol");

const NULL_ADDRESS = "0x".padEnd(42, "0");

contract("Factory", function (accounts) {
  const CORE_ADDRESS = accounts[1];
  const CORE_PARAMETER = CORE_ADDRESS.substr(2).padStart(64, "0").toLowerCase();

  const TOKEN_CONTRACT_ID = 0;

  let code, codeHash;
  let factory;

  beforeEach(async function () {
    factory = await FactoryMock.new();
    code = ProxyMock.bytecode;
    codeHash = web3.utils.sha3(code);
  });

  it("should have no code code", async function () {
    const codeFound = await factory.contractCode(TOKEN_CONTRACT_ID);
    assert.equal(codeFound, null, "no code");
  });

  it("should define a proxy code", async function () {
    const tx = await factory.defineCode(TOKEN_CONTRACT_ID, code);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "ContractCodeDefined", "event");
    assert.equal(tx.logs[0].args.contractId, TOKEN_CONTRACT_ID, "codeHash");
    assert.equal(tx.logs[0].args.codeHash, codeHash, "codeHash");
  });

  describe("With code defined without parameters", function () {
    beforeEach(async function () {
      await factory.defineCode(TOKEN_CONTRACT_ID, code);
    });

    it("should have a code", async function () {
      const codeFound = await factory.contractCode(TOKEN_CONTRACT_ID);
      assert.equal(codeFound, code, "code");
    });

    it("should let deploy a contract with its parameters", async function () {
      const tx = await factory.deployContract(TOKEN_CONTRACT_ID, "0x" + CORE_PARAMETER);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "ContractDeployed", "event");
      assert.equal(tx.logs[0].args.contractId, TOKEN_CONTRACT_ID, "codeHash");
      assert.equal(tx.logs[0].args.address_.length, 42, "contract address length");
      assert.ok(tx.logs[0].args.address_ !== NULL_ADDRESS, "contract address not null");
    });

    it("should prevent deploy a contract with not formatted parameters", async function () {
      await assertRevert(factory.deployContract(TOKEN_CONTRACT_ID, CORE_ADDRESS), "FA02");
    });

    it("should prevent deploy a contract with no parameters", async function () {
      await assertRevert(factory.deployContract(TOKEN_CONTRACT_ID, "0x"), "FA02");
    });

    describe("With a coontract deployed", function () {
      let contract, contractAddress;

      beforeEach(async function () {
        const tx = await factory.deployContract(TOKEN_CONTRACT_ID, "0x" + CORE_PARAMETER);
        contractAddress = tx.logs[0].args.address_;
        contract = await ProxyMock.at(contractAddress);
      });

      it("should have a contract correctly initialized", async function () {
        const core = await contract.core();
        assert.equal(core, CORE_ADDRESS, "core address");
      });
    });
  });

  describe("With a code defined with its parameters", function () {
    beforeEach(async function () {
      await factory.defineCode(TOKEN_CONTRACT_ID, code + CORE_PARAMETER);
    });

    it("should let deploy a contract directly", async function () {
      const tx = await factory.deployContract(TOKEN_CONTRACT_ID, "0x");
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "ContractDeployed", "event");
      assert.equal(tx.logs[0].args.contractId, TOKEN_CONTRACT_ID, "codeHash");
      assert.equal(tx.logs[0].args.address_.length, 42, "contract address length");
      assert.ok(tx.logs[0].args.address_ !== NULL_ADDRESS, "contract address not null");
    });

    describe("With a coontract deployed", function () {
      let contract, contractAddress;

      beforeEach(async function () {
        const tx = await factory.deployContract(TOKEN_CONTRACT_ID, "0x");
        contractAddress = tx.logs[0].args.address_;
        contract = await ProxyMock.at(contractAddress);
      });

      it("should have a contract correctly initialized", async function () {
        const core = await contract.core();
        assert.equal(core, CORE_ADDRESS, "core address");
      });
    });
  });
});
