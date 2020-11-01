pragma solidity ^0.6.0;

import "../core/Core.sol";


/**
 * @title CoreMock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract CoreMock is Core {

  function defineDelegateMock(uint256 _delegateId, address _delegate) public returns (bool) {
    return defineDelegateInternal(_delegateId, _delegate);
  }

  function defineProxyMock(address _proxy, uint256 _delegateId) public returns (bool) {
    return defineProxyInternal(_proxy, _delegateId);
  }

  function successOnlyProxy(bool _success) public view onlyProxy returns (bool) {
    return _success;
  }

  function delegateCallMock(bool) public returns (bool) {
    return delegateCall(msg.sender);
  }

  function delegateCallBoolMock(bool) public returns (bool) {
    return delegateCallBool(msg.sender);
  }

  function delegateCallUint256Mock(uint256) public returns (uint256) {
    return delegateCallUint256(msg.sender);
  }

  function delegateCallBytesMock(bytes memory) public returns (bytes memory) {
    return delegateCallBytes(msg.sender);
  }

  function migrateProxyMock(address _proxy, address _newCore) public returns (bool) {
    return migrateProxyInternal(_proxy, _newCore);
  }

  function removeProxyMock(address _proxy) public returns (bool) {
    return removeProxyInternal(_proxy);
  }
}
