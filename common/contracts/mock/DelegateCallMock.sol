pragma solidity ^0.8.0;

import "../call/DelegateCall.sol";


/**
 * @title DelegateCallMock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract DelegateCallMock {
  using DelegateCall for address;

  address public delegate;

  constructor(address _delegate) {
    delegate = _delegate;
  }

  function delegateMockTxSuccess(bool) public returns (bool) {
    return delegate._delegateCall();
  }

  function delegateMockTxFail(bool) public returns (bool) {
    return delegate._delegateCall();
  }

  function delegateCallBoolMock(bool) public returns (bool) {
    return delegate._delegateCallBool();
  }

  function delegateCallBoolFalseMock(bool) public returns (bool) {
    return delegate._delegateCallBool();
  }

  function delegateCallUint256Mock(uint256) public returns (uint256) {
    return delegate._delegateCallUint256();
  }

  function delegateCallBytesMock(bytes memory) public returns (bytes memory) {
    return delegate._delegateCallBytes();
  }

}
