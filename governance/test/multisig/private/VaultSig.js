'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require('../../helpers/assertRevert');
const signer = require('../../helpers/signer');

const VaultSig = artifacts.require('multisig/private/VaultSig.sol');
const Token = artifacts.require('mock/TokenERC20Mock.sol');

const SIGNER_TYPES = ['address', 'uint256', 'bytes', 'uint256', 'bytes32'];

contract('VaultSig', function (accounts) {
  let vaultSig;
  let token, request;

  const sign = async function (values, address) {
    const replayProtection = await vaultSig.replayProtection();
    return signer.sign(SIGNER_TYPES, values.concat(replayProtection), address);
  };

  describe('with one address and a threshold of 2', function () {
    beforeEach(async function () {
      vaultSig = await VaultSig.new([accounts[1]], 2);
      token = await Token.new('Test', 'TST', 18, vaultSig.address, 1000);
      request = {
        params: [{
          to: token.address,
          data: token.contract.methods.transfer(accounts[0], 100).encodeABI(),
        }],
      };
    });

    it('should not execute ERC20 transfer', async function () {
      const signature = await sign([ request.params[0].to, 0, request.params[0].data, 0 ], accounts[1]);

      await assertRevert(
        vaultSig.execute([signature],
          request.params[0].to, 0, request.params[0].data, 0),
        'MS01');
    });
  });

  describe('with one address and threshold of 1', function () {
    beforeEach(async function () {
      vaultSig = await VaultSig.new([accounts[1]], 1);
      token = await Token.new('Test', 'TST', 18, vaultSig.address, 1000);
      request = {
        params: [{
          to: token.address,
          data: token.contract.methods.transfer(accounts[0], 100).encodeABI(),
        }],
      };
      await new Promise(
        (resolve, reject) => web3.eth.sendTransaction({
          from: accounts[9],
          to: vaultSig.address,
          value: web3.utils.toWei('1', 'gwei'),
        }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }),
      );
    });

    it('should accept data with ETH in the same transaction', async function () {
      const receipt = await web3.eth.sendTransaction({
        from: accounts[0],
        to: vaultSig.address,
        value: 1,
        data: web3.utils.fromAscii('abc'),
      });

      assert.ok(receipt.status, 'status');
    });

    it('should transfer ETH', async function () {
      const signature = await sign([ accounts[0], 1, '0x', 0 ], accounts[1]);
      const tx = await vaultSig.transfer([signature],
        accounts[0], 1);
      assert.ok(tx.receipt.status, 'status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'Execution');
      assert.equal(tx.logs[0].args.to, accounts[0], 'to');
      assert.equal(tx.logs[0].args.value.toNumber(), 1, 'value');
      assert.equal(tx.logs[0].args.data, null, 'data');
    });

    it('should transfer ERC20 using transferERC20', async function () {
      const signature = await sign([ token.address, 0, request.params[0].data, 0 ], accounts[1]);

      const tx = await vaultSig.transferERC20([signature],
        token.address, accounts[0], 100);
      assert.ok(tx.receipt.status, 'status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'Execution');
      assert.equal(tx.logs[0].args.to, token.address, 'to');
      assert.equal(tx.logs[0].args.value, 0, 'value');
      assert.equal(tx.logs[0].args.data, request.params[0].data, 'data');

      const balance = await token.balanceOf(vaultSig.address);
      assert.equal(balance, 900, 'balance multisig');
      const balance0 = await token.balanceOf(accounts[0]);
      assert.equal(balance0, 100, 'balance account 0');
    });

    it('should execute ETH transfer', async function () {
      const signature = await sign([ accounts[0], 1, '0x', 0 ], accounts[1]);
      const tx = await vaultSig.execute([signature],
        accounts[0], 1, '0x', 0);
      assert.ok(tx.receipt.status, 'status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'Execution');
      assert.equal(tx.logs[0].args.to, accounts[0], 'to');
      assert.equal(tx.logs[0].args.value.toNumber(), 1, 'value');
      assert.equal(tx.logs[0].args.data, null, 'data');
    });

    it('should execute ERC20 transfer', async function () {
      const signature = await sign([ token.address, 0, request.params[0].data, 0 ], accounts[1]);

      const tx = await vaultSig.execute([signature],
        token.address, 0, request.params[0].data, 0);
      assert.ok(tx.receipt.status, 'status');
      assert.equal(tx.logs.length, 1, 'logs');
      assert.equal(tx.logs[0].event, 'Execution');
      assert.equal(tx.logs[0].args.to, token.address, 'to');
      assert.equal(tx.logs[0].args.value, 0, 'value');
      assert.equal(tx.logs[0].args.data, request.params[0].data, 'data');

      const balance = await token.balanceOf(vaultSig.address);
      assert.equal(balance, 900, 'balance multisig');
      const balance0 = await token.balanceOf(accounts[0]);
      assert.equal(balance0, 100, 'balance account 0');
    });

    it('should not execute both ETH and ERC20 transfer', async function () {
      const signature = await sign([ token.address, 1, request.params[0].data, 0 ], accounts[1]);

      await assertRevert(
        vaultSig.execute([signature],
          token.address, 1, request.params[0].data, 0),
        'VS01');
    });
  });
});
