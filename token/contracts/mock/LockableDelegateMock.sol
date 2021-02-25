pragma solidity ^0.8.0;

import "../delegate/LockableDelegate.sol";
import "./DelegateMock.sol";


/**
 * @title LockableDelegateMock
 * @dev LockableDelegateMock contract
 * This rule allow locking token during a period of time
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * FTD01: The address is frozen
 */
contract LockableDelegateMock is LockableDelegate, DelegateMock {

  /**
   * @dev defineLockProxies
   */
  function defineLockProxies(address[] memory _locks) public returns (bool) {
    delegates[1] = address(this);
    for(uint256 i=0; i < _locks.length; i++) {
      proxyDelegateIds[_locks[i]] = 1;
    }
    return true;
  }

  /**
   * @dev testIsLocked
   */
  function testIsLocked(address _token,
    address _caller, address _sender, address _receiver,
    uint256 _value) public view returns (bool)
  {
    STransferData memory transferData_ = transferData(
      _token, _caller, _sender, _receiver, _value);

    return isLocked(transferData_);
  }
}
