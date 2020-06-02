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
 * LTD01: token is currently locked
 * LTD02: startAt must be before or equal to endAt
 */
abstract contract LockableDelegate is TokenStorage {

  /**
   * @dev define lock
   */
  function defineLock(
    address _token,
    uint256 _startAt,
    uint256 _endAt,
    address[] memory _exceptions) public returns (bool)
  {
    require(_startAt < _endAt, "LTD01");
    tokens[_token].lock = Lock(_startAt, _endAt);
    Lock storage tokenLock = tokens[_token].lock;
    for (uint256 i=0; i < _exceptions.length; i++) {
      tokenLock.exceptions[_exceptions[i]] = true;
    }
    emit LockDefined(_token, _startAt, _endAt, _exceptions);
    return true;
  }

  /**
   * @dev isUnlocked
   */
  function isLocked(STransferData memory _transferData) internal view returns (bool) {
    Lock storage tokenLock = tokens[_transferData.token].lock;
    // solhint-disable-next-line not-rely-on-time
    uint256 currentTime = now;
    return currentTime < tokenLock.endAt
      && currentTime >= tokenLock.startAt
      && !tokenLock.exceptions[_transferData.caller]
      && !tokenLock.exceptions[_transferData.sender]
      && !tokenLock.exceptions[_transferData.receiver];
  }
}
