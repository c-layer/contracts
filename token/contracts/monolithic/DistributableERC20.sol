pragma solidity ^0.8.0;

import "./MintableTokenERC20.sol";
import "./Distributable.sol";


/**
 * @title DistributableERC20
 * @dev DistributableERC20 token contract
 * This contract provides a token ERC20 with distribution
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract DistributableERC20 is MintableTokenERC20, Distributable {

  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    address _initialAccount,
    uint256 _initialSupply
  ) MintableTokenERC20(_name, _symbol, _decimals, _initialAccount, _initialSupply)
  {}
}
