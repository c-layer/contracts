pragma solidity ^0.6.0;

import "@c-layer/common/contracts/operable/Ownable.sol";
import "../interface/ITimeLock.sol";


/**
 * @title TimeLock
 * @dev Time locked contract
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   TL01: Contract is locked
 *   TL02: Target must be defined
 *   TL03: Cannot be locked in the past
 *   TL04: Execution must be successfull
 */
contract TimeLock is ITimeLock, Ownable {

  address payable internal target_;
  uint64 internal lockedUntil_;

  modifier whenUnlocked() {
    require(lockedUntil_ < currentTime(), "TL01");
    _;
  }

  constructor(address payable _target, uint64 _lockedUntil) public {
    require(_target != address(0), "TL02");
    require(_lockedUntil > currentTime(), "TL03");
    lockedUntil_ = _lockedUntil;
    target_ = _target;
  }

  function target() external override view returns (address payable) {
    return target_;
  }

  function lockedUntil() external override view returns (uint64) {
    return lockedUntil_;
  }

  receive() external override payable {
    callInternal();
  }

  fallback() external override payable {
    callInternal();
  }

  function callInternal() internal onlyOwner whenUnlocked {
    // solhint-disable-next-line avoid-call-value, avoid-low-level-calls
    (bool success, ) = target_.call{ value: msg.value }(msg.data);
    require(success, "TL04");
  }

  /**
   * @dev current time
   */
  function currentTime() internal view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return block.timestamp;
  }
}


