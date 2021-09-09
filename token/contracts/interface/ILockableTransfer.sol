pragma solidity ^0.8.0;


/**
 * @title ILockableTransfer interface
 *
 * SPDX-License-Identifier: MIT
 */
interface ILockableTransfer {

  event LockDefined(
    address sender,
    address receiver,
    uint256 startAt,
    uint256 endAt
  );

  function lock(address _sender, address _receiver) external view returns (
    uint64 startAt, uint64 endAt);
  function defineLock(
    address _sender,
    address _receiver,
    uint64 _startAt,
    uint64 _endAt) external returns (bool);
  function isTransferLocked(address _sender, address _receiver) external view returns (bool);
}
