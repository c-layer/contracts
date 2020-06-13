'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const Ownable = artifacts.require('Ownable.sol');

const NULL_ADDRESS = '0x'.padEnd(42, '0');

contract('Ownable', function (accounts) {
  let contract;

  beforeEach(async function () {
    contract = await Ownable.new();
  });

  it('Should have a owner', async function () {
    const owner = await contract.owner();
    assert.equal(owner, accounts[0], 'owner');
  });

  it('should renounce ownership', async function () {
    const tx = await contract.renounceOwnership();

    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'OwnershipRenounced', 'event');
    assert.equal(tx.logs[0].args.previousOwner, accounts[0]);
  });

  it('should prevent non owner to renounce ownership', async function () {
    await assertRevert(contract.renounceOwnership({ from: accounts[1] }), 'OW01');
  });

  it('should transfer ownership', async function () {
    const tx = await contract.transferOwnership(accounts[1]);

    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'OwnershipTransferred', 'event');
    assert.equal(tx.logs[0].args.previousOwner, accounts[0]);
    assert.equal(tx.logs[0].args.newOwner, accounts[1]);
  });

  it('should prevent non owner to transfer ownership', async function () {
    await assertRevert(contract.transferOwnership(accounts[1], { from: accounts[1] }), 'OW01');
  });

  it('should prevent owner to transfer ownership to an invalid address', async function () {
    await assertRevert(contract.transferOwnership(NULL_ADDRESS), 'OW02');
  });
});
