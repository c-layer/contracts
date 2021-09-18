'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const signer = require('../helpers/signer');
const SignerRecoveryMock = artifacts.require('SignerRecoveryMock.sol');

const NONCE = 5;
const BYTES = web3.utils.toHex('TheAnswerToLife').padEnd(66, '0');

contract('SignerRecovery', function (accounts) {
  let contract;

  beforeEach(async function () {
    contract = await SignerRecoveryMock.new();
  });

  it('should recover account 1 from signature using parameters', async function () {
    const signature = await signer.sign(
      [ 'address', 'address', 'uint64', 'bytes' ],
      [ contract.address, accounts[0], NONCE, BYTES ],
      accounts[1]);

    const recoveredSigner = await contract.testRecoverSigner(signature, NONCE, BYTES);
    assert.equal(recoveredSigner, accounts[1]);
  });

  it('should not recover account 1 from signature using invalid parameters', async function () {
    const signature = await signer.sign(
      [ 'address', 'address', 'uint64', 'bytes' ],
      [ contract.address, accounts[0], NONCE + 1, BYTES ],
      accounts[1]);

    const recoveredSigner = await contract.testRecoverSigner(signature, NONCE, BYTES);
    assert.notEqual(recoveredSigner, accounts[1]);
  });

  it('should recover account 1 from signature using the signed message hash', async function () {
    const hash = await signer.buildHash(
      [ 'address', 'address', 'uint64', 'bytes' ],
      [ contract.address, accounts[0], NONCE, BYTES ],
    );

    const signature = await signer.sign(
      [ 'address', 'address', 'uint64', 'bytes' ],
      [ contract.address, accounts[0], NONCE, BYTES ],
      accounts[1]);

    const recoveredSigner = await contract.testRecoverSigner(signature, hash);
    assert.equal(recoveredSigner, accounts[1]);
  });

  it('should not recover account 1 from signature using an invalid message hash', async function () {
    const hash = await signer.buildHash(
      [ 'address', 'address', 'uint64', 'bytes' ],
      [ contract.address, accounts[0], NONCE + 1, BYTES ],
    );

    const signature = await signer.sign(
      [ 'address', 'address', 'uint64', 'bytes' ],
      [ contract.address, accounts[0], NONCE, BYTES ],
      accounts[1]);

    const recoveredSigner = await contract.testRecoverSigner(signature, hash);
    assert.notEqual(recoveredSigner, accounts[1]);
  });
});
