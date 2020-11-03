'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const DelegateViewMock = artifacts.require('DelegateViewMock.sol');
const DelegateCallViewMock = artifacts.require('DelegateCallViewMock.sol');

const BYTES = web3.utils.toHex('TheAnswerToLife').padEnd(66, '0');

contract('DelegateCallView', function (accounts) {
  let delegateView, delegate;

  beforeEach(async function () {
    delegate = await DelegateViewMock.new();
    delegateView = await DelegateCallViewMock.new(delegate.address);
  });

  it('should delegate call view bool', async function () {
    const success = await delegateView.delegateCallBoolMock.call(true);
    assert.ok(success, 'success');
  });

  it('should fail with error when unsucessfull call view bool', async function () {
    await assertRevert(delegateView.delegateCallBoolMock.call(false), 'DVM02');
  });

  it('should delegate call view uint256', async function () {
    const result = await delegateView.delegateCallUint256Mock.call(42);
    assert.equal(result.toString(), '42', 'result');
  });

  it('should fail with error when unsuccessfull call view uint256', async function () {
    await assertRevert(delegateView.delegateCallUint256Mock.call(0), 'DVM03');
  });

  it('should delegate call view bytes', async function () {
    const bytes = await delegateView.delegateCallBytesMock.call(BYTES);
    assert.equal(bytes.length, 194, 'bytes length');
    assert.ok(bytes.indexOf(BYTES.substr(2)) !== -1, 'bytes ends');
  });

  it('should fail with error when unsucessfull call view bytes', async function () {
    await assertRevert(delegateView.delegateCallBytesMock.call('0x'), 'DVM04');
  });

  it('should not be possible to call forwardCallBytes directly', async function () {
    await assertRevert(delegateView.forwardCallBytes(delegate.address, '0x'), 'DV01');
  });
});
