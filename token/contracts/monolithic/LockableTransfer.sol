pragma solidity ^0.8.0;

import "@c-layer/common/contracts/operable/Operable.sol";
import "../interface/ILockableTransfer.sol";


/**
 * @title LockableTransfer
 * @dev LockableTransfer contract
 * This contract provides locks on transfer
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * LT01: startAt must be before or equal to endAt
 */
contract LockableTransfer is Operable, ILockableTransfer {

  address internal constant ANY_ADDRESSES = address(0x416e79416464726573736573); // "AnyAddresses"

  struct LockData {
    uint64 startAt;
    uint64 endAt;
  }

  // Sender x Receiver x LockData
  mapping (address => mapping(address => LockData)) internal locks;

  /**
   * @dev lock
   */
  function lock(address _sender, address _receiver) override external view returns (
    uint64 startAt, uint64 endAt)
  {
    LockData storage lockData_ = locks[_sender][_receiver];
    return (lockData_.startAt, lockData_.endAt);
  }

  /**
   * @dev define lock
   */
  function defineLock(
    address _sender,
    address _receiver,
    uint64 _startAt,
    uint64 _endAt) override external onlyOperator returns (bool)
  {
    require(_startAt <= _endAt, "LT01");
    locks[_sender][_receiver] = LockData(_startAt, _endAt);
    emit LockDefined(_sender, _receiver, _startAt, _endAt);
    return true;
  }

  /**
   * @dev isLocked
   *
   * @notice There are three levels of locks: transfer, directional and token
   * @notice All locks with an end date in the future are considered applicable
   * @notice The check is done on the most specific active level
   */
  function isTransferLocked(address _sender, address _receiver) override public view returns (bool)
  {
    // solhint-disable-next-line not-rely-on-time
    uint256 currentTime = block.timestamp;

    LockData storage lockData = locks[_sender][_receiver];
    if (lockData.endAt < currentTime) {
      LockData storage senderLockData = locks[_sender][ANY_ADDRESSES];
      LockData storage receiverLockData = locks[ANY_ADDRESSES][_receiver];

      // specific case when both sender and receiver locks are active
      if (senderLockData.endAt >= currentTime && receiverLockData.endAt >= currentTime) {
        return
          (currentTime < senderLockData.endAt && currentTime >= senderLockData.startAt) ||
          (currentTime < receiverLockData.endAt && currentTime >= receiverLockData.startAt);
      }

      lockData = senderLockData;
      if (lockData.endAt < currentTime) {
        lockData = receiverLockData;
      }
    }

    if (lockData.endAt < currentTime) {
      lockData = locks[ANY_ADDRESSES][ANY_ADDRESSES];
    }

    return (currentTime < lockData.endAt && currentTime >= lockData.startAt);
  }
}
