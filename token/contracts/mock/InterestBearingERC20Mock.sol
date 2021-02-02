pragma solidity ^0.6.0;

import "../monolithic/InterestBearingERC20.sol";


/**
 * @title InterestBearingERC20Mock
 * @dev Interest Bearing ERC20 token mock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract InterestBearingERC20Mock is InterestBearingERC20 {

  uint256 private currentTime_;

  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    address _initialAccount,
    uint256 _initialSupply
  ) public InterestBearingERC20(_name, _symbol, _decimals, _initialAccount, _initialSupply) {
  }

  function defineTestingTimes(uint256 _currentTime, uint256 _interestFrom) public returns (bool)
  {
    currentTime_ = _currentTime;
    interestFrom_ = _interestFrom;
    return true;
  }

  function currentTime() internal override view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return (currentTime_ == 0) ? block.timestamp : currentTime_;
  }
}
