pragma solidity ^0.6.0;


/**
 * @title IInterestBearingERC20 interface
 *
 * SPDX-License-Identifier: MIT
 */
abstract contract IInterestBearingERC20 {

  uint256 public constant REBASE_AT_ONCE = 10;
  uint256 public constant INTEREST_PERIOD = 31557600; // 365.25 * 24 * 3600 seconds a year;

  event InterestUpdate(uint256 rate, uint256 elasticity);
  event InterestRebase(uint256 at, uint256 elasticity);

  function interest() external virtual view returns (uint256, uint256);
  function elasticityAt(uint256 _at) public virtual view returns (uint256);

  function rebaseInterest() public virtual returns (bool);
  function defineInterest(uint256 _rate) external virtual returns (bool);
}
