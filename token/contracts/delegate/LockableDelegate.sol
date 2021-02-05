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
  function defineTokenLocks(address _token, address[] memory _locks) public returns (bool)
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
    address _sender,
    address _receiver,
    uint64 _startAt,
    uint64 _endAt) public returns (bool)
  {
    require(_startAt <= _endAt, "LD02");
    locks[_lock][_sender][_receiver] = LockData(_startAt, _endAt);
    emit LockDefined(_lock, _sender, _receiver, _startAt, _endAt);
    return true;
  }

  /**
   * @dev isLocked
   */
  function isLocked(STransferData memory _transferData)
    internal view returns (bool isLocked_)
  {
    address[] storage lockAddresses = tokens[_transferData.token].locks;
    // solhint-disable-next-line not-rely-on-time
    uint256 currentTime = block.timestamp;

    for (uint256 i=0; i < lockAddresses.length && !isLocked_; i++) {
      address lockAddress = lockAddresses[i];
      LockData storage lockData = locks[lockAddress][_transferData.sender][_transferData.receiver];

      if (lockData.endAt < currentTime) {
        LockData storage senderLockData = locks[lockAddress][_transferData.sender][ANY_ADDRESSES];
        LockData storage receiverLockData = locks[lockAddress][ANY_ADDRESSES][_transferData.receiver];

        if (senderLockData.endAt >= currentTime && receiverLockData.endAt >= currentTime) {
          isLocked_ =
            (currentTime < senderLockData.endAt && currentTime >= senderLockData.startAt) ||
            (currentTime < receiverLockData.endAt && currentTime >= receiverLockData.startAt);
          continue;
        }

        lockData = senderLockData;
        if (lockData.endAt < currentTime) {
          lockData = receiverLockData;
        }
      }

      if (lockData.endAt < currentTime) {
        lockData = locks[lockAddress][ANY_ADDRESSES][ANY_ADDRESSES];
      }

      isLocked_ =
        (currentTime < lockData.endAt && currentTime >= lockData.startAt);
    }
  }
}
