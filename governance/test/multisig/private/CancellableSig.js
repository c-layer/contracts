'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require('../../helpers/assertRevert');
const signer = require('../../helpers/signer');

const CancellableSig = artifacts.require('multisig/private/CancellableSig.sol');

contract('CancellableSig', function (accounts) {
  let cancellableSig;
  let rsv;

  describe('with one address and threshold of 1', function () {
    beforeEach(async function () {
      cancellableSig = await CancellableSig.new([accounts[1]], 1);
      signer.multiSig = cancellableSig;

      rsv = await signer.sign(accounts[1], 0, web3.utils.toHex('data'), 0, accounts[1]);

      const review = await cancellableSig.reviewSignatures(
        accounts[1], 0, web3.utils.toHex('data'), 0,
        [rsv.r], [rsv.s], [rsv.v]);
      assert.equal(review.toNumber(), 1);
    });

    it('should not cancel when not a signer', async function () {
      await assertRevert(cancellableSig.cancel(), 'MS03');
    });

    it('should cancel a transaction when signer', async function () {
      await cancellableSig.cancel({ from: accounts[1] });
      const review = await cancellableSig.reviewSignatures(
        accounts[1], 0, web3.utils.toHex('data'), 0,
        [rsv.r], [rsv.s], [rsv.v]);
      assert.equal(review.toNumber(), 0);
    });
  });
});
