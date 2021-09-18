'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require('../../helpers/assertRevert');
const signer = require('../../helpers/signer');

const LockableSig = artifacts.require('multisig/private/LockableSig.sol');
const Token = artifacts.require('mock/TokenERC20Mock.sol');

const SIGNER_TYPES = ['address', 'uint256', 'bytes', 'uint256', 'bytes32'];

contract('LockableSig', function (accounts) {
  const DATA_TO_SIGN = web3.utils.sha3('LOCK');
  let token, request;
  let lockableSig;

  const sign = async function (values, address) {
    const replayProtection = await lockableSig.replayProtection();
    return signer.sign(SIGNER_TYPES, values.concat(replayProtection), address);
  };

  describe('with one address and threshold of 1', function () {
    beforeEach(async function () {
      lockableSig = await LockableSig.new([accounts[1]], 1);
      token = await Token.new('Test', 'TST', 18, lockableSig.address, 1000);
      request = {
        params: [{
          to: token.address,
          data: token.contract.methods.transfer(accounts[0], 100).encodeABI(),
        }],
      };
    });

    it('should provide data to sign', async function () {
      const dataToSign = await lockableSig.LOCK();
      assert.equal(DATA_TO_SIGN, dataToSign, 'data to sign');
    });

    it('should be unlocked', async function () {
      const locked = await lockableSig.isLocked();
      assert.ok(!locked, 'locked');
    });

    it('should lock', async function () {
      const tx = await lockableSig.lock({ from: accounts[1] });
      assert.ok(tx.receipt.status, 'status');

      const locked = await lockableSig.isLocked();
      assert.ok(locked, 'locked');
    });

    it('should prevent non signer to lock', async function () {
      await assertRevert(lockableSig.lock(), 'MS03');
    });

    it('should execute ERC20 transfer', async function () {
      const signature = await sign([ request.params[0].to, 0, request.params[0].data, 0 ], accounts[1]);

      const tx = await lockableSig.execute([signature],
        request.params[0].to, 0, request.params[0].data, 0);
      assert.ok(tx.receipt.status, 'status');

      const balance = await token.balanceOf(lockableSig.address);
      assert.equal(balance, 900, 'balance multisig');
      const balance0 = await token.balanceOf(accounts[0]);
      assert.equal(balance0, 100, 'balance account 0');
    });

    describe('when locked', function () {
      beforeEach(async function () {
        await lockableSig.lock({ from: accounts[1] });
      });

      it('should prevent ERC20 transfer', async function () {
        const signature = await sign([ request.params[0].to, 0, request.params[0].data, 0 ], accounts[1]);

        await assertRevert(
          lockableSig.execute([signature],
            request.params[0].to, 0, request.params[0].data, 0),
          'LS01');
      });

      it('should unlock', async function () {
        const signature = await sign([ lockableSig.address, 0, DATA_TO_SIGN, 0 ], accounts[1]);
        const tx = await lockableSig.unlock([signature]);
        assert.ok(tx.receipt.status, 'status');

        const locked = await lockableSig.isLocked();
        assert.ok(!locked, 'locked');
      });

      describe('when unlocked', function () {
        beforeEach(async function () {
          const signature = await sign([ lockableSig.address, 0, DATA_TO_SIGN, 0 ], accounts[1]);
          await lockableSig.unlock([signature]);
        });

        it('should execute ERC20 transfer', async function () {
          const signature = await sign([ request.params[0].to, 0, request.params[0].data, 0 ], accounts[1]);

          const tx = await lockableSig.execute([signature],
            request.params[0].to, 0, request.params[0].data, 0);
          assert.ok(tx.receipt.status, 'status');

          const balance = await token.balanceOf(lockableSig.address);
          assert.equal(balance, 900, 'balance multisig');
          const balance0 = await token.balanceOf(accounts[0]);
          assert.equal(balance0, 100, 'balance account 0');
        });
      });
    });
  });
});
