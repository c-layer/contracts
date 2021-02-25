'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertOutOfBounds = require('../helpers/assertOutOfBounds.js');
const assertRevert = require('../helpers/assertRevert.js');
const SafeMathMock = artifacts.require('SafeMathMock.sol');

const MAX_UINT = '0x'.padEnd(64, 'f');

contract('SafeMath', function (accounts) {
  let contract;

  beforeEach(async function () {
    contract = await SafeMathMock.new();
  });

  it('should add', async function () {
    const c = await contract.add(1, 2);
    assert.equal(c.toString(), '3', 'addition');
  });

  it('should prevent add overflow', async function () {
    await assertOutOfBounds(contract.add(MAX_UINT, 1));
  });

  it('should prevent add negative overflow', async function () {
    await assertOutOfBounds(contract.add(-1, 1));
  });

  it('should sub', async function () {
    const c = await contract.sub(3, 1);
    assert.equal(c.toString(), '2', 'substraction');
  });

  it('should prevent sub overflow', async function () {
    await assertRevert(contract.sub(0, 1));
  });

  it('should mul', async function () {
    const c = await contract.mul(2, 3);
    assert.equal(c.toString(), '6', 'multiplication');
  });

  it('should mul with shortcut when first element is 0', async function () {
    const c = await contract.mul(0, 3);
    assert.equal(c.toString(), '0', 'multiplication');
  });

  it('should prevent mul overflow', async function () {
    await assertOutOfBounds(contract.mul(MAX_UINT, 2));
  });

  it('should prevent negative mul overflow', async function () {
    await assertOutOfBounds(contract.mul(-1, 2));
  });

  it('should div', async function () {
    const c = await contract.div(6, 2);
    assert.equal(c.toString(), '3', 'division');
  });

  it('should prevent div by 0', async function () {
    await assertRevert(contract.div(1, 0));
  });
});
