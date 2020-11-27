pragma solidity ^0.6.0;

import "@c-layer/distribution/contracts/WrappedERC20.sol";


/**
 * @title WrappedERC20 Mock
 * @dev WrappedERC20 Mock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 **/
contract WrappedERC20Mock is WrappedERC20 {

  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    IERC20 _base
  ) public WrappedERC20(_name, _symbol, _decimals, _base) {
  }
}
