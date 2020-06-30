pragma solidity ^0.6.0;

import "@c-layer/common/contracts/token/TokenERC20.sol";

/**
 * @title Token ERC20 mock
 * @dev Token ERC20 mock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 **/
contract TokenERC20Mock is TokenERC20 {

  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    address _initialAccount,
    uint256 _initialSupply
  ) public TokenERC20(_name, _symbol, _decimals, _initialAccount, _initialSupply) {}
}
