pragma solidity ^0.6.0;

import "../core/Core.sol";


/**
 * @title CoreMock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   AM01: Must be successfull
 *   AM02: Value must be not null
 *   AM03: Message must be defined
 */
contract CoreMock is Core {

  function defineDelegateMock(uint256 _delegateId, address _delegate) public returns (bool) {
    return _defineDelegate(_delegateId, _delegate);
  }

  function defineProxyMock(address _proxy, uint256 _delegateId) public returns (bool) {
    return _defineProxy(_proxy, _delegateId);
  }

  function successOnlyProxy(bool _success) public view onlyProxy returns (bool) {
    return _success;
  }

  function delegateCallMock(bool) public returns (bool) {
    return _delegateCall(msg.sender);
  }

  function delegateCallUint256Mock(uint256) public returns (uint256) {
    return _delegateCallUint256(msg.sender);
  }

  function delegateCallBytesMock(bytes memory) public returns (bytes memory) {
    return _delegateCallBytes(msg.sender);
  }

  function migrateProxyMock(address _proxy, address _newCore) public returns (bool) {
    return _migrateProxy(_proxy, _newCore);
  }

  function removeProxyMock(address _proxy) public returns (bool) {
    return _removeProxy(_proxy);
  }
}
