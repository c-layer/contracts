'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require('../../helpers/assertRevert');
const signer = require('../../helpers/signer');

const MultiSig = artifacts.require('multisig/private/MultiSig.sol');
const Token = artifacts.require('mock/TokenERC20Mock.sol');

const SIGNER_TYPES = ['address', 'uint256', 'bytes', 'uint256', 'bytes32'];
const NULL_ADDRESS = '0x'.padEnd(42, '0');

contract('MultiSig', function (accounts) {
  let multiSig, token, request;

  before(async function () {
    token = await Token.new('Test', 'TST', 18, accounts[0], 10000);
    request = {
      params: [{
        to: token.address,
        data: token.contract.methods.transfer(accounts[1], 100).encodeABI(),
      }],
    };
  });

  const buildHash = async function (values) {
    const replayProtection = await multiSig.replayProtection();
    return signer.buildHash(SIGNER_TYPES, values.concat(replayProtection));
  };

  const sign = async function (values, address) {
    const replayProtection = await multiSig.replayProtection();
    return signer.sign(SIGNER_TYPES, values.concat(replayProtection), address);
  };

  describe('with one address and threshold of 1', function () {
    beforeEach(async function () {
      multiSig = await MultiSig.new([accounts[1]], 1);
      signer.multiSig = multiSig;
    });

    it('should not read empty selector', async function () {
      const selector = await multiSig.readSelector('0x');
      assert.equal(selector, '0x00000000', 'selector');
    });

    it('should read selector for a token call', async function () {
      const data = request.params[0].data;
      const selector = await multiSig.readSelector(data);
      assert.equal(selector, data.substring(0, 10), 'selector');
    });

    it('should read ERC20 destination for a token call', async function () {
      const data = request.params[0].data;
      const destination = await multiSig.readERC20Destination(data);
      assert.equal(destination, accounts[1], 'destination');
    });

    it('should read ERC20 value for a token call', async function () {
      const data = request.params[0].data;
      const value = await multiSig.readERC20Value(data);
      assert.equal(value.toNumber(), 100, 'value');
    });

    it('should have 1 addresses', async function () {
      const addresses = await multiSig.signers();
      assert.equal(addresses.length, 1, 'length');
      assert.equal(addresses[0], accounts[1], 'account 1');
    });

    it('should have a threshold of 1', async function () {
      const threshold = await multiSig.threshold();
      assert.equal(threshold, 1);
    });

    it('should have a replay protection', async function () {
      const replayProtection = await multiSig.replayProtection();
      assert.ok(replayProtection.startsWith('0x'), 34, 'replay proection');
      assert.ok(replayProtection.length, 34, 'replay proection');
    });

    it('should have a nonce', async function () {
      const nonce = await multiSig.nonce();
      assert.equal(nonce, 1);
    });

    it('should review signatures', async function () {
      const signature = await sign(
        [ accounts[0], 0, web3.utils.toHex('data'), 0 ], accounts[1]);
      const review = await multiSig.reviewSignatures(
        [signature], accounts[0], 0, web3.utils.toHex('data'), 0);
      assert.equal(review.toNumber(), 1);
    });

    it('should not review signatures with wrong destination', async function () {
      const signature = await sign(
        [ accounts[0], 0, web3.utils.toHex('data'), 0 ], accounts[1]);
      const review = await multiSig.reviewSignatures(
        [signature], accounts[1], 0, web3.utils.toHex('data'), 0);
      assert.equal(review.toNumber(), 0);
    });

    it('should review signatures with wrong value', async function () {
      const signature = await sign(
        [ accounts[0], 0, web3.utils.toHex('data'), 0 ], accounts[1]);
      const review = await multiSig.reviewSignatures(
        [signature], accounts[0], 1000, web3.utils.toHex('data'), 0);
      assert.equal(review.toNumber(), 0);
    });

    it('should review signatures with wrong data', async function () {
      const signature = await sign(
        [ accounts[0], 0, web3.utils.toHex('data'), 0 ], accounts[1]);
      const review = await multiSig.reviewSignatures(
        [signature], accounts[0], 0, web3.utils.toHex('alphabet'), 0);
      assert.equal(review.toNumber(), 0);
    });

    it('should review signatures with wrong validity', async function () {
      const signature = await sign(
        [ accounts[0], 0, web3.utils.toHex('data'), 0 ], accounts[1]);
      const review = await multiSig.reviewSignatures(
        [signature], accounts[0], 0, web3.utils.toHex('data'), 1000);
      assert.equal(review.toNumber(), 0);
    });

    it('should review with wrong signatures', async function () {
      const signature = await sign(
        [ accounts[0], 0, web3.utils.toHex('data'), 0 ], accounts[2]);
      const review = await multiSig.reviewSignatures(
        [signature], accounts[0], 0, web3.utils.toHex('data'), 0);
      assert.equal(review.toNumber(), 0);
    });

    it('should not recover the address', async function () {
      const recover = await multiSig.recoverAddress(
        '0x1', accounts[0], 0, web3.utils.toHex('data'), 0);
      assert.equal(recover, NULL_ADDRESS, 'unrecoverable address');
    });

    it('should recover the address', async function () {
      const signature = await sign(
        [ accounts[0], 0, web3.utils.toHex('data'), 0 ], accounts[1]);
      const recover = await multiSig.recoverAddress(
        signature, accounts[0], 0, web3.utils.toHex('data'), 0);
      assert.equal(recover, accounts[1], 'recovered address');
    });

    it('should build the hash', async function () {
      const expectedHash = await buildHash(
        [ accounts[0], 0, web3.utils.toHex('data'), 0 ]);
      const hash = await multiSig.buildHash(accounts[0], 0, web3.utils.toHex('data'), 0);
      assert.equal(hash, expectedHash, 'hash');
    });

    it('should recover the address with no tx data', async function () {
      const signature = await sign(
        [ accounts[0], 0, '0x', 0 ], accounts[1]);
      const recover = await multiSig.recoverAddress(
        signature, accounts[0], 0, '0x', 0);
      assert.equal(recover, accounts[1], 'recovered address');
    });

    it('should build the hash with no tx data', async function () {
      const expectedHash = await buildHash([ accounts[0], 0, '0x', 0 ]);
      const hash = await multiSig.buildHash(accounts[0], 0, '0x', 0);
      assert.equal(hash, expectedHash, 'hash');
    });

    it('should receive ETH', async function () {
      await new Promise((resolve, reject) => web3.eth.sendTransaction({
        from: accounts[0],
        to: multiSig.address,
        value: web3.utils.toWei('1', 'milli'),
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }));

      const balanceETH = await web3.eth.getBalance(multiSig.address);
      assert.equal(balanceETH, web3.utils.toWei('1', 'milli'), 'balance multiSig');
    });

    it('should receive ETH with data', async function () {
      await new Promise((resolve, reject) => web3.eth.sendTransaction({
        from: accounts[0],
        to: multiSig.address,
        value: web3.utils.toWei('1', 'milli'),
        data: '0x123456',
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }));

      const balanceETH = await web3.eth.getBalance(multiSig.address);
      assert.equal(balanceETH, web3.utils.toWei('1', 'milli'), 'balance multiSig');
    });

    describe('with ETH in the contract', function () {
      beforeEach(async function () {
        await new Promise((resolve, reject) => web3.eth.sendTransaction({
          from: accounts[0],
          to: multiSig.address,
          value: web3.utils.toWei('1', 'milli'),
        }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }));
      });

      it('should reject ETH transfer with too few signatures', async function () {
        await assertRevert(
          multiSig.execute([],
            accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0),
          'MS01');
      });

      it('should reject ETH transfer with too many signatures', async function () {
        const signature1 = await sign(
          [ accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0 ], accounts[1]);
        const signature2 = await sign(
          [ accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0 ], accounts[2]);
        await assertRevert(
          multiSig.execute(
            [signature1, signature2],
            accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0),
          'MS01');
      });

      it('should reject ETH transfer with wrong signature', async function () {
        const signature = await sign(
          [ accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0 ], accounts[2]);
        await assertRevert(
          multiSig.execute([signature],
            accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0),
          'MS01');
      });

      it('should reject ETH transfer with too old signature validity', async function () {
        const signature = await sign(
          [ accounts[0], web3.utils.toWei('1', 'milli'), '0x', 1 ], accounts[1]);
        await assertRevert(
          multiSig.execute([signature],
            accounts[0], web3.utils.toWei('1', 'milli'), '0x', 1),
          'MS02');
      });

      it('should reject ETH transfer with inconsistent validity (signature vs execute)', async function () {
        const signature = await sign(
          [ accounts[0], web3.utils.toWei('1', 'milli'), '0x', 1000 ], accounts[1]);
        await assertRevert(
          multiSig.execute([signature],
            accounts[0], web3.utils.toWei('1', 'milli'), '0x', 10000),
          'MS01');
      });

      it('should allow ETH transfer and withdraw all ETH', async function () {
        const signature = await sign(
          [ accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0 ], accounts[1]);
        const tx = await multiSig.execute([signature],
          accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0);
        assert.ok(tx.receipt.status, 'status');
        assert.equal(tx.logs[0].event, 'Execution');
        assert.equal(tx.logs[0].args.to, accounts[0], 'to');
        assert.equal(tx.logs[0].args.value, web3.utils.toWei('1', 'milli'), 'value');
        assert.equal(tx.logs[0].args.data, null, 'data');

        const balanceETH = await web3.eth.getBalance(multiSig.address);
        assert.equal(balanceETH, web3.utils.toWei('0', 'milli'), 'balance multiSig');
      });

      it('should allow ETH transfer and withdraw all ETH with a future validity', async function () {
        const signature = await sign(
          [
            accounts[0], web3.utils.toWei('1', 'milli'),
            '0x',
            '100000000000000000000',
          ],
          accounts[1]);
        const tx = await multiSig.execute([signature],
          accounts[0], web3.utils.toWei('1', 'milli'), '0x', '100000000000000000000');
        assert.ok(tx.receipt.status, 'status');
        assert.equal(tx.logs[0].event, 'Execution');
        assert.equal(tx.logs[0].args.to, accounts[0], 'to');
        assert.equal(tx.logs[0].args.value, web3.utils.toWei('1', 'milli'), 'value');
        assert.equal(tx.logs[0].args.data, null, 'data');

        const balanceETH = await web3.eth.getBalance(multiSig.address);
        assert.equal(balanceETH, web3.utils.toWei('0', 'milli'), 'balance multiSig');
      });
    });

    describe('with some ERC20', function () {
      beforeEach(async function () {
        token.transfer(multiSig.address, 100);
      });

      it('should not execute ERC20 transfer with missing signatures', async function () {
        await assertRevert(
          multiSig.execute([],
            request.params[0].to, 0, request.params[0].data, 0),
          'MS01');
      });

      it('should not execute ERC20 transfer with too many signatures', async function () {
        const signature1 = await sign(
          [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[1]);
        const signature2 = await sign(
          [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[2]);
        await assertRevert(
          multiSig.execute(
            [signature1, signature2],
            request.params[0].to, 0, request.params[0].data, 0),
          'MS01');
      });

      it('should not execute ERC20 transfer with wrong signature', async function () {
        const signature = await sign(
          [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[2]);
        await assertRevert(
          multiSig.execute(
            [signature], request.params[0].to, 0, request.params[0].data, 0),
          'MS01');
      });

      it('should execute ERC20 transfer', async function () {
        const balance1 = await token.balanceOf(accounts[1]);
        const signature = await sign(
          [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[1]);
        const tx = await multiSig.execute(
          [signature],
          request.params[0].to, 0, request.params[0].data, 0);
        assert.ok(tx.receipt.status, 'status');

        const balance = await token.balanceOf(multiSig.address);
        assert.equal(balance.toNumber(), 0, 'balance multisig');
        const balance1After = await token.balanceOf(accounts[1]);
        assert.equal(balance1After.sub(balance1).toNumber(), 100, 'balance account 1');
      });
    });
  });

  describe('with three addresses and threshold of 2', function () {
    beforeEach(async function () {
      multiSig = await MultiSig.new([accounts[1], accounts[2], accounts[3]], 2);
      signer.multiSig = multiSig;
    });

    it('should have 3 addresses', async function () {
      const addresses = await multiSig.signers();
      assert.equal(addresses.length, 3, 'length');
      assert.equal(addresses[0], accounts[1], 'account 1');
      assert.equal(addresses[1], accounts[2], 'account 2');
      assert.equal(addresses[2], accounts[3], 'account 3');
    });

    it('should have a threshold of 2', async function () {
      const threshold = await multiSig.threshold();
      assert.equal(threshold, 2);
    });

    it('should review correct signature for ETH transfer', async function () {
      const signature = await sign(
        [ accounts[0], 0, '0x', 0 ], accounts[1]);
      const review = await multiSig.reviewSignatures(
        [signature], accounts[0], 0, '0x', 0);
      assert.equal(review.toNumber(), 1);
    });

    it('should review correct signatures for account 1 and 2', async function () {
      const signature1 = await sign(
        [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[1]);
      const signature2 = await sign(
        [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[2]);
      const review = await multiSig.reviewSignatures(
        [signature1, signature2], request.params[0].to, 0, request.params[0].data, 0);
      assert.equal(review.toNumber(), 2);
    });

    it('should review correct signatures for account 2 and 3', async function () {
      const signature2 = await sign(
        [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[2]);
      const signature3 = await sign(
        [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[3]);
      const review = await multiSig.reviewSignatures(
        [signature2, signature3], request.params[0].to, 0, request.params[0].data, 0);
      assert.equal(review.toNumber(), 2);
    });

    it('should review correct signature for account 1', async function () {
      const signature = await sign(
        [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[1]);
      const review = await multiSig.reviewSignatures(
        [signature], request.params[0].to, 0, request.params[0].data, 0);
      assert.equal(review.toNumber(), 1);
    });

    it('should review correct signature for account 3', async function () {
      const signature = await sign(
        [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[3]);
      const review = await multiSig.reviewSignatures(
        [signature], request.params[0].to, 0, request.params[0].data, 0);
      assert.equal(review.toNumber(), 1);
    });

    it('should review incorrect signatures (wrong order)', async function () {
      const signature1 = await sign(
        [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[2]);
      const signature2 = await sign(
        [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[1]);
      const review = await multiSig.reviewSignatures(
        [signature1, signature2], request.params[0].to, 0, request.params[0].data, 0);
      assert.equal(review.toNumber(), 0);
    });

    it('should review incorrect signatures (twice same addresse)', async function () {
      const signature1 = await sign(
        [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[1]);
      const signature2 = await sign(
        [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[1]);
      const review = await multiSig.reviewSignatures(
        [signature1, signature2], request.params[0].to, 0, request.params[0].data, 0);
      assert.equal(review.toNumber(), 0);
    });

    it('should review incorrect signatures (wrong participant)', async function () {
      const signature1 = await sign(
        [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[1]);
      const signature4 = await sign(
        [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[4]);
      const review = await multiSig.reviewSignatures(
        [signature1, signature4], request.params[0].to, 0, request.params[0].data, 0);
      assert.equal(review.toNumber(), 0);
    });

    it('should review incorrect signatures (no participants)', async function () {
      const review = await multiSig.reviewSignatures(
        [], request.params[0].to, 0, request.params[0].data, 0);
      assert.equal(review.toNumber(), 0);
    });

    it('should review incorrect signatures (too many participants)', async function () {
      const signature1 = await sign(
        [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[1]);
      const signature2 = await sign(
        [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[2]);
      const signature3 = await sign(
        [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[3]);
      const signature4 = await sign(
        [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[4]);
      const review = await multiSig.reviewSignatures(
        [signature1, signature2, signature3, signature4],
        request.params[0].to, 0, request.params[0].data, 0);
      assert.equal(review.toNumber(), 0);
    });

    describe('with ETH in the contract', function () {
      beforeEach(async function () {
        await new Promise((resolve, reject) => web3.eth.sendTransaction({
          from: accounts[0],
          to: multiSig.address,
          value: web3.utils.toWei('1', 'milli'),
        }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }));
      });

      it('should reject ETH transfer with few signatures', async function () {
        const signature1 = await sign(
          [ accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0 ], accounts[1]);
        await assertRevert(
          multiSig.execute(
            [signature1],
            accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0),
          'MS01');
      });

      it('should reject ETH transfer with too many signatures', async function () {
        const signature1 = await sign(
          [ accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0 ], accounts[1]);
        const signature2 = await sign(
          [ accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0 ], accounts[2]);
        const signature3 = await sign(
          [ accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0 ], accounts[3]);
        const signature4 = await sign(
          [ accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0 ], accounts[4]);
        await assertRevert(
          multiSig.execute(
            [signature1, signature2, signature3, signature4],
            accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0),
          'MS01');
      });

      it('should reject ETH transfer with wrong signature', async function () {
        const signature1 = await sign(
          [ accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0 ], accounts[1]);
        const signature4 = await sign(
          [ accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0 ], accounts[4]);
        await assertRevert(
          multiSig.execute(
            [signature1, signature4],
            accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0),
          'MS01');
      });

      it('should allow ETH transfer and withdraw all ETH with threshold', async function () {
        const signature1 = await sign(
          [ accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0 ], accounts[1]);
        const signature2 = await sign(
          [ accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0 ], accounts[2]);
        const tx = await multiSig.execute(
          [signature1, signature2],
          accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0);
        assert.ok(tx.receipt.status, 'status');
        assert.equal(tx.logs[0].event, 'Execution');
        assert.equal(tx.logs[0].args.to, accounts[0], 'to');
        assert.equal(tx.logs[0].args.value, web3.utils.toWei('1', 'milli'), 'value');
        assert.equal(tx.logs[0].args.data, null, 'data');

        const balanceETH = await web3.eth.getBalance(multiSig.address);
        assert.equal(balanceETH, web3.utils.toWei('0', 'milli'), 'balance multiSig');
      });

      it('should allow ETH transfer and withdraw all ETH with all signatures', async function () {
        const signature1 = await sign(
          [ accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0 ], accounts[1]);
        const signature2 = await sign(
          [ accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0 ], accounts[2]);
        const signature3 = await sign(
          [ accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0 ], accounts[3]);
        const tx = await multiSig.execute(
          [signature1, signature2, signature3],
          accounts[0], web3.utils.toWei('1', 'milli'), '0x', 0);
        assert.ok(tx.receipt.status, 'status');
        assert.equal(tx.logs[0].event, 'Execution');
        assert.equal(tx.logs[0].args.to, accounts[0], 'to');
        assert.equal(tx.logs[0].args.value, web3.utils.toWei('1', 'milli'), 'value');
        assert.equal(tx.logs[0].args.data, null, 'data');

        const balanceETH = await web3.eth.getBalance(multiSig.address);
        assert.equal(balanceETH, web3.utils.toWei('0', 'milli'), 'balance multiSig');
      });
    });

    describe('with some ERC20', function () {
      beforeEach(async function () {
        token.transfer(multiSig.address, 100);
      });

      it('should reject ERC20 transfer with few signatures', async function () {
        const signature1 = await sign(
          [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[1]);
        await assertRevert(
          multiSig.execute(
            [signature1],
            request.params[0].to, 0, request.params[0].data, 0),
          'MS01');
      });

      it('should reject ERC20 transfer with too many signatures', async function () {
        const signature1 = await sign(
          [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[1]);
        const signature2 = await sign(
          [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[2]);
        const signature3 = await sign(
          [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[3]);
        const signature4 = await sign(
          [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[4]);
        await assertRevert(
          multiSig.execute(
            [signature1, signature2, signature3, signature4],
            request.params[0].to, 0, request.params[0].data, 0),
          'MS01');
      });

      it('should reject ERC20 transfer with wrong signatures', async function () {
        const signature1 = await sign(
          [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[1]);
        const signature4 = await sign(
          [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[4]);
        await assertRevert(
          multiSig.execute(
            [signature1, signature4],
            request.params[0].to, 0, request.params[0].data, 0),
          'MS01');
      });

      it('should execute ERC20 transfer with threshold', async function () {
        const balance1 = await token.balanceOf(accounts[1]);
        const signature1 = await sign(
          [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[1]);
        const signature3 = await sign(
          [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[3]);
        const tx = await multiSig.execute(
          [signature1, signature3],
          request.params[0].to, 0, request.params[0].data, 0);
        assert.ok(tx.receipt.status, 'status');
        assert.equal(tx.logs.length, 1, 'logs');
        assert.equal(tx.logs[0].event, 'Execution');
        assert.equal(tx.logs[0].args.to, token.address, 'to');
        assert.equal(tx.logs[0].args.value, 0, 'value');
        assert.equal(tx.logs[0].args.data, request.params[0].data, 'data');

        const balance = await token.balanceOf(multiSig.address);
        assert.equal(balance.toNumber(), 0, 'balance multisig');
        const balance1After = await token.balanceOf(accounts[1]);
        assert.equal(balance1After.sub(balance1).toNumber(), 100, 'balance account 1');
      });

      it('should execute ERC20 transfer with all signatures', async function () {
        const balance1 = await token.balanceOf(accounts[1]);
        const signature1 = await sign(
          [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[1]);
        const signature2 = await sign(
          [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[2]);
        const signature3 = await sign(
          [ request.params[0].to, 0, request.params[0].data, 0 ], accounts[3]);
        const tx = await multiSig.execute(
          [signature1, signature2, signature3],
          request.params[0].to, 0, request.params[0].data, 0);
        assert.ok(tx.receipt.status, 'status');
        assert.equal(tx.logs.length, 1, 'logs');
        assert.equal(tx.logs[0].event, 'Execution');
        assert.equal(tx.logs[0].args.to, token.address, 'to');
        assert.equal(tx.logs[0].args.value, 0, 'value');
        assert.equal(tx.logs[0].args.data, request.params[0].data, 'data');

        const balance = await token.balanceOf(multiSig.address);
        assert.equal(balance.toNumber(), 0, 'balance multisig');
        const balance1After = await token.balanceOf(accounts[1]);
        assert.equal(balance1After.sub(balance1).toNumber(), 100, 'balance account 1');
      });
    });
  });
});
