'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const DelegateMock = artifacts.require('DelegateMock.sol');
const DelegateCallViewMock = artifacts.require('DelegateCallViewMock.sol');

const BYTES = web3.utils.toHex('TheAnswerToLife').padEnd(66, '0');

contract('Core', function (accounts) {
  let delegateView, delegate;

  beforeEach(async function () {
    delegate = await DelegateMock.new();
    delegateView = await DelegateCallViewMock.new(delegate.address);
  });

  it('should fail if the delegate call does not succeed', async function () {
    await assertRevert(delegateView.delegateCallBoolMock.call(false), 'DV01');
  });

  it('should delegate call view bool', async function () {
    const success = await delegateView.delegateCallBoolMock.call(true);
    assert.ok(success, 'success');
  });

  it('should delegate call view uint256', async function () {
    const result = await delegateView.delegateCallUint256Mock.call(42);
    assert.equal(result.toString(), '42', 'result');
  });

  it('should delegate call view bytes', async function () {
    const bytes = await delegateView.delegateCallBytesMock.call(BYTES);
    assert.equal(bytes.length, 194, 'bytes length');
    assert.ok(bytes.indexOf(BYTES.substr(2)) !== -1, 'bytes ends');
  });

  it('should not be possible to call forwardCallBytes directly', async function () {
    await assertRevert(delegateView.forwardCallBytes(), 'DV01');
  });
});
