pragma solidity ^0.8.0;
  
import "../lock/TimeLock.sol";


/**
 * @title TimeLockMock
 * @dev Generic TimeLock
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * @author Guillaume Goutaudier - <ggoutaudier@swissledger.io>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract TimeLockMock is TimeLock {

  constructor(address payable _target, uint64 _lockedUntil)
    TimeLock(_target, _lockedUntil) {}

  function setLockedUntilTest(uint64 _lockedUntil) public returns (bool) {
    lockedUntil_ = _lockedUntil;
    return true;
  }
}

