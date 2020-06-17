'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertJump = require('../helpers/assertJump');
const SafeMathMock = artifacts.require('SafeMathMock.sol');

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
    await assertJump(contract.add(-1, 1));
  });

  it('should sub', async function () {
    const c = await contract.sub(3, 1);
    assert.equal(c.toString(), '2', 'substraction');
  });

  it('should prevent sub overflow', async function () {
    await assertJump(contract.sub(0, 1));
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
    await assertJump(contract.mul(-1, 2));
  });

  it('should div', async function () {
    const c = await contract.div(6, 2);
    assert.equal(c.toString(), '3', 'division');
  });

  it('should prevent div by 0', async function () {
    await assertJump(contract.div(1, 0));
  });
});
