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

  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    address _initialAccount,
    uint256 _initialSupply
  ) public InterestBearingERC20(_name, _symbol, _decimals, _initialAccount, _initialSupply) {
  }

  function defineInterestFrom(uint256 _interestFrom) public returns (bool)
  {
    interestFrom_ = _interestFrom;
    return true;
  }
}
