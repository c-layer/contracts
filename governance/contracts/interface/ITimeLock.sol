pragma solidity ^0.6.0;


/**
 * @title ITimeLock
 * @dev ITimeLock interface
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
interface ITimeLock {

  function target() external view returns (address payable);
  function lockedUntil() external view returns (uint64);

  fallback() external payable;
  receive() external payable;
}
