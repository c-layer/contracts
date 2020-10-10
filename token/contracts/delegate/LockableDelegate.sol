pragma solidity ^0.6.0;

import "./STransferData.sol";
import "../TokenStorage.sol";


/**
 * @title LockableDelegate
 * @dev LockableDelegate contract
 * This rule allows to lock assets for a period of time
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * LD01: locks must be valid proxies
 * LD02: startAt must be before or equal to endAt
 */
abstract contract LockableDelegate is TokenStorage {

  /**
   * @dev define token lock
   */
  function defineTokenLocks(address _token, address[] memory _locks)
    public returns (bool)
  {
    for(uint256 i=0; i < _locks.length; i++) {
      require(delegates[proxyDelegateIds[_locks[i]]] != address(0), "LD01");
    }

    tokens[_token].locks = _locks;
    emit TokenLocksDefined(_token, _locks);
  }

  /**
   * @dev define lock
   */
  function defineLock(
    address _lock,
    uint256 _startAt,
    uint256 _endAt,
    address[] memory _exceptions) public returns (bool)
  {
    require(_startAt <= _endAt, "LD02");
    locks[_lock] = Lock(_startAt, _endAt, _exceptions);
    Lock storage lock = locks[_lock];
    for (uint256 i=0; i < _exceptions.length; i++) {
      lock.exceptions[_exceptions[i]] = true;
    }
    emit LockDefined(_lock, _startAt, _endAt, _exceptions);
    return true;
  }

  /**
   * @dev isLocked
   */
  function isLocked(STransferData memory _transferData) internal view returns (bool isLocked_) {
    address[] storage lockAddresses = tokens[_transferData.token].locks;

    for (uint256 i=0; i < lockAddresses.length; i++) {
      Lock storage tokenLock = locks[lockAddresses[i]];
      // solhint-disable-next-line not-rely-on-time
      uint256 currentTime = now;
      isLocked_ = isLocked_ || (currentTime < tokenLock.endAt
        && currentTime >= tokenLock.startAt
        && !tokenLock.exceptions[_transferData.caller]
        && !tokenLock.exceptions[_transferData.sender]
        && !tokenLock.exceptions[_transferData.receiver]);
    }
  }
}
