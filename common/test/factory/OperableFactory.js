'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const OperableFactory = artifacts.require('OperableFactory.sol');
const ProxyMock = artifacts.require('ProxyMock.sol');

const NULL_ADDRESS = '0x'.padEnd(42, '0');

contract('OperableFactory', function (accounts) {
  const CORE_ADDRESS = accounts[1];
  const CORE_PARAMETER = '0x' + CORE_ADDRESS.substr(2).padStart(64, '0').toLowerCase();

  const TOKEN_PROXY_ID = 0;

  let proxyCode, proxyCodeHash;
  let factory;

  beforeEach(async function () {
    factory = await OperableFactory.new();
    proxyCode = ProxyMock.bytecode;
    proxyCodeHash = web3.utils.sha3(proxyCode);
  });

  it('should have no blueprint', async function () {
    const blueprint = await factory.blueprint(TOKEN_PROXY_ID);
    assert.equal(blueprint.template, undefined, 'template');
    assert.equal(blueprint.bytecode, null, 'bytecode');
    assert.equal(blueprint.parameters, null, 'parameters');
  });

  it('should define a contract code', async function () {
    const tx = await factory.defineBlueprint(TOKEN_PROXY_ID, NULL_ADDRESS, proxyCode, '0x');
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'BlueprintDefined', 'event');
    assert.equal(tx.logs[0].args.codeHash, proxyCodeHash, 'proxy codeHash');
  });

  describe('With proxy code defined', function () {
    beforeEach(async function () {
      await factory.defineBlueprint(TOKEN_PROXY_ID, NULL_ADDRESS, proxyCode, '0x');
    });

    it('should have a blueprint', async function () {
      const blueprint = await factory.blueprint(TOKEN_PROXY_ID);
      assert.equal(blueprint.template, undefined, 'template');
      assert.equal(blueprint.bytecode, proxyCode, 'bytecode');
      assert.equal(blueprint.parameters, null, 'parameters');
    });

    it('should let deploy a contract', async function () {
      const tx = await factory.deployContract(TOKEN_PROXY_ID, CORE_PARAMETER);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'ContractDeployed', 'event');
      assert.equal(tx.logs[0].args.address_.length, 42, 'proxy address length');
      assert.ok(tx.logs[0].args.address_ !== NULL_ADDRESS, 'proxy address not null');
    });

    describe('With a contract deployed', function () {
      let contract, contractAddress;

      beforeEach(async function () {
        const tx = await factory.deployContract(TOKEN_PROXY_ID, CORE_PARAMETER);
        contractAddress = tx.logs[0].args.address_;
        contract = await ProxyMock.at(contractAddress);
      });

      it('should have a contract with initialized', async function () {
        const core = await contract.core();
        assert.equal(core, CORE_ADDRESS, 'core address');
      });
    });
  });
});
