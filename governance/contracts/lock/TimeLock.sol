pragma solidity ^0.6.0;
import "@c-layer/common/contracts/operable/Ownable.sol";


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
contract TimeLock is Ownable {

  address payable public target;
  uint64 public lockedUntil;

  modifier whenUnlocked() {
    require(lockedUntil < currentTime(), "TL01");
    _;
  }

  constructor(address payable _target, uint64 _lockedUntil) public {
    require(_target != address(0), "TL02");
    require(_lockedUntil > currentTime(), "TL03");
    lockedUntil = _lockedUntil;
    target = _target;
  }

  receive() external payable {
    require(callInternal(), "TL04");
  }

  fallback() external payable {
    require(callInternal(), "TL04");
  }

  function callInternal() internal onlyOwner whenUnlocked returns (bool) {
    (bool success, ) =
    // solhint-disable-next-line avoid-call-value, avoid-low-level-calls
    target.call{value: msg.value}(msg.data);
    return success;
  }

  /**
   * @dev current time
   */
  function currentTime() internal view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return now;
  }
}


