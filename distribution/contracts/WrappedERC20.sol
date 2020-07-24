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

  IERC20 internal base_;

  /**
   * @dev constructor
   */
  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    IERC20 _base
  ) public
    TokenERC20(_name, _symbol, _decimals, address(0), 0)
  {
    base_ = _base;
  }

  /**
   * @dev base token
   */
  function base() public view override returns (IERC20) {
    return base_;
  }

  /**
   * @dev deposit
   */
  function deposit(uint256 _value) public override returns (bool) {
    require(base_.allowance(msg.sender, address(this)) >= _value, "WE01");
    require(base_.transferFrom(msg.sender, address(this), _value), "WE02");

    balances[msg.sender] = balances[msg.sender].add(_value);
    emit Deposit(msg.sender, _value);

    return true;
  }

  /**
   * @dev withdraw
   */
  function withdraw(uint256 _value) public override returns (bool) {
    require(balances[msg.sender] >= _value, "WE03");
    require(base_.transfer(msg.sender, _value), "WE04");

    balances[msg.sender] = balances[msg.sender].sub(_value);
    emit Withdrawal(msg.sender, _value);

    return true;
  }
}
