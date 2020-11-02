'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const DelegateMock = artifacts.require('DelegateMock.sol');
const DelegateCallMock = artifacts.require('DelegateCallMock.sol');

const BYTES = web3.utils.toHex('TheAnswerToLife').padEnd(66, '0');

contract('DelegateCall', function (accounts) {
  let delegate, delegateCall;

  beforeEach(async function () {
    delegate = await DelegateMock.new();
    delegateCall = await DelegateCallMock.new(delegate.address);
  });

  it('should have status true if the successfull delegate does succeed', async function () {
    const tx = await delegateCall.delegateMockTxSuccess(true);
    assert.ok(tx.receipt.status, 'Status');
  });

  it('should have status fail if the successfull delegate does not succeed', async function () {
    await assertRevert(delegateCall.delegateMockTxSuccess(false), 'DM01');
  });

  it('should have status true if the unsuccessfull delegate does succeed', async function () {
    const tx = await delegateCall.delegateMockTxFail(false);
    assert.ok(tx.receipt.status, 'Status');
  });

  it('should have status fail if the unsuccessfull delegate does not succeed', async function () {
    await assertRevert(delegateCall.delegateMockTxFail(true), 'DM02');
  });

  it('should delegate bool', async function () {
    const tx = await delegateCall.delegateCallBoolMock(true);
    assert.ok(tx.receipt.status, 'Status');
  });

  it('should fail with error when unsucessfull bool', async function () {
    await assertRevert(delegateCall.delegateCallBoolMock(false), 'DM03');
  });

  it('should delegate bool false', async function () {
    const tx = await delegateCall.delegateCallBoolFalseMock(false);
    assert.ok(tx.receipt.status, 'Status');
  });

  it('should fail with error when sucessfull bool', async function () {
    await assertRevert(delegateCall.delegateCallBoolFalseMock(true), 'DM04');
  });

  it('should delegate uint256', async function () {
    const tx = await delegateCall.delegateCallUint256Mock(42);
    assert.ok(tx.receipt.status, 'Status');
  });

  it('should fail with error when unsuccessfull uint256', async function () {
    await assertRevert(delegateCall.delegateCallUint256Mock(0), 'DM05');
  });

  it('should delegate bytes', async function () {
    const tx = await delegateCall.delegateCallBytesMock(BYTES);
    assert.ok(tx.receipt.status, 'Status');
  });

  it('should fail with error when unsucessfull bytes', async function () {
    await assertRevert(delegateCall.delegateCallBytesMock('0x'), 'DM06');
  });
});
