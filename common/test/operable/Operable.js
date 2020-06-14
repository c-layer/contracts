'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const Operable = artifacts.require('Operable.sol');

contract('Operable', function (accounts) {
  let contract;

  beforeEach(async function () {
    contract = await Operable.new();
  });

  it('should have owner as operator', async function () {
    const isOperator = await contract.isOperator(accounts[0]);
    assert.ok(isOperator, 'is operator');
  });

  it('should have non owner not operator', async function () {
    const isOperator = await contract.isOperator(accounts[1]);
    assert.ok(!isOperator, 'is not operator');
  });

  it('should let operator define an operator', async function () {
    const tx = await contract.defineOperator('Test', accounts[1]);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'OperatorDefined', 'event');
    assert.equal(tx.logs[0].args.role, 'Test', 'role');
    assert.equal(tx.logs[0].args.address_, accounts[1], 'address');
  });

  it('should let operator remove an operator', async function () {
    const tx = await contract.removeOperator(accounts[0]);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'OperatorRemoved', 'event');
    assert.equal(tx.logs[0].args.address_, accounts[0], 'address');
  });

  it('should prevent defining owner again as an operator', async function () {
    await assertRevert(contract.defineOperator('Operator', accounts[0]), 'OP03');
  });

  it('should prevent removing non existant operator', async function () {
    await assertRevert(contract.removeOperator(accounts[1]), 'OP02');
  });

  it('should prevent non owner to define an operator', async function () {
    await assertRevert(contract.defineOperator('Operator', accounts[1], { from: accounts[1] }), 'OW01');
  });

  it('should prevent non owner to remove an operator', async function () {
    await assertRevert(contract.removeOperator(accounts[0], { from: accounts[1] }), 'OW01');
  });
});
