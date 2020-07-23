pragma solidity ^0.6.0;

import "./interface/IWrappedERC20.sol";


/**
 * @title WrappedERC20
 * @dev WrappedERC20
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   WE01: Allowance is too low to deposit
 *   WE02: Unable to deposit the base token
 *   WE03: Too many tokens to withdraw
 *   WE04: Unable to withdraw the base token
 */
contract WrappedERC20 is TokenERC20, IWrappedERC20 {

  TokenERC20 internal base_;

  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    TokenERC20 _base
  ) public TokenERC20(_name, _symbol, _decimals, address(0), 0) {
    base_ = _base;
  }

  function base() public view override returns (TokenERC20) {
    return base_;
  }

  function deposit(uint256 _value) public override returns (bool) {
    require(base_.allowance(msg.sender, address(this)) >= _value, "WE01");
    require(base_.transferFrom(msg.sender, address(this), _value), "WE02");

    balances[msg.sender] = balances[msg.sender].add(_value);
    emit Deposit(msg.sender, _value);

    return true;
  }
  
  function withdraw(uint256 _value) public override returns (bool) {
    require(balances[msg.sender] >= _value, "WE03");
    require(base_.transfer(msg.sender, _value), "WE04");

    balances[msg.sender] = balances[msg.sender].sub(_value);
    emit Withdrawal(msg.sender, _value);

    return true;
  }
}
