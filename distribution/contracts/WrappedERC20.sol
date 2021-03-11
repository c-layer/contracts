pragma solidity ^0.8.0;

import "@c-layer/common/contracts/token/TokenERC20.sol";
import "./interface/IWrappedERC20.sol";


/**
 * @title WrappedERC20
 * @dev WrappedERC20
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   WE01: Unable to transfer tokens to address 0
 *   WE02: Unable to deposit the base token
 *   WE03: Not enougth tokens
 *   WE04: Approval too low
 *   WE05: Unable to withdraw the base token
 */
contract WrappedERC20 is TokenERC20, IWrappedERC20 {

  IERC20 internal base_;
  uint256 internal ratio_;

  /**
   * @dev constructor
   */
  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    IERC20 _base
  ) TokenERC20(_name, _symbol, _decimals, address(0), 0)
  {
    ratio_ = 10 ** (_decimals - _base.decimals());
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
    return depositTo(msg.sender, _value);
  }

  /**
   * @dev depositTo
   */
  function depositTo(address _to, uint256 _value) public override returns (bool) {
    require(_to != address(0), "WE01");
    require(base_.transferFrom(msg.sender, address(this), _value), "WE02");

    uint256 wrappedValue = _value * ratio_;
    balances[_to] = balances[_to]  + wrappedValue;
    totalSupply_ = totalSupply_ + wrappedValue;
    emit Transfer(address(0), _to, wrappedValue);
    return true;
  }

  /**
   * @dev withdraw
   */
  function withdraw(uint256 _value) public override returns (bool) {
    return withdrawFrom(msg.sender, msg.sender, _value);
  }

  /**
   * @dev withdrawFrom
   */
  function withdrawFrom(address _from, address _to, uint256 _value) public override returns (bool) {
    require(_to != address(0), "WE01");
    uint256 wrappedValue = _value * ratio_;
    require(wrappedValue <= balances[_from], "WE03");

    if (_from != msg.sender) {
      require(wrappedValue <= allowed[_from][msg.sender], "WE04");
      allowed[_from][msg.sender] = allowed[_from][msg.sender] - wrappedValue;
    }

    balances[_from] = balances[_from] - wrappedValue;
    totalSupply_ = totalSupply_ - wrappedValue;
    emit Transfer(_from, address(0), wrappedValue);

    require(base_.transfer(_to, _value), "WE05");
    return true;
  }
}
