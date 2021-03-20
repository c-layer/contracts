pragma solidity ^0.8.0;

import "../interface/IERC20.sol";


/**
 * @title Token ERC20
 * @dev Token ERC20 default implementation
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   TE01: Recipient is invalid
 *   TE02: Not enougth tokens
 *   TE03: Approval too low
 */
contract TokenERC20 is IERC20 {

  string internal name_;
  string internal symbol_;
  uint256 internal decimals_;

  uint256 internal totalSupply_;
  mapping(address => uint256) internal balances;
  mapping (address => mapping (address => uint256)) internal allowed;

  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    address _initialAccount,
    uint256 _initialSupply
  ) {
    name_ = _name;
    symbol_ = _symbol;
    decimals_ = _decimals;
    totalSupply_ = _initialSupply;
    balances[_initialAccount] = _initialSupply;

    emit Transfer(address(0), _initialAccount, _initialSupply);
  }

  function name() external override view returns (string memory) {
    return name_;
  }

  function symbol() external override view returns (string memory) {
    return symbol_;
  }

  function decimals() external override view returns (uint256) {
    return decimals_;
  }

  function totalSupply() external override virtual view returns (uint256) {
    return totalSupply_;
  }

  function balanceOf(address _owner) external override virtual view returns (uint256) {
    return balances[_owner];
  }

  function allowance(address _owner, address _spender)
    external override view returns (uint256)
  {
    return allowed[_owner][_spender];
  }

  function transfer(address _to, uint256 _value) external override virtual returns (bool) {
    return transferFromInternal(msg.sender, _to, _value);
  }

  function transferFrom(address _from, address _to, uint256 _value)
    external override virtual returns (bool)
  {
    return transferFromInternal(_from, _to, _value);
  }

  function transferFromInternal(address _from, address _to, uint256 _value)
    internal virtual returns (bool)
  {
    require(_to != address(0), "TE01");
    require(_value <= balances[_from], "TE02");

    if (_from != msg.sender) {
      require(_value <= allowed[_from][msg.sender], "TE03");
      allowed[_from][msg.sender] = allowed[_from][msg.sender] - _value;
    }

    balances[_from] = balances[_from] - _value;
    balances[_to] = balances[_to] + _value;
    emit Transfer(_from, _to, _value);
    return true;
  }

  function approve(address _spender, uint256 _value) external override returns (bool) {
    allowed[msg.sender][_spender] = _value;
    emit Approval(msg.sender, _spender, _value);
    return true;
  }

  function increaseApproval(address _spender, uint _addedValue)
    external override returns (bool)
  {
    allowed[msg.sender][_spender] =
      allowed[msg.sender][_spender] + _addedValue;
    emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }

  function decreaseApproval(address _spender, uint _subtractedValue)
    external override returns (bool)
  {
    uint oldValue = allowed[msg.sender][_spender];
    if (_subtractedValue > oldValue) {
      allowed[msg.sender][_spender] = 0;
    } else {
      allowed[msg.sender][_spender] = oldValue - _subtractedValue;
    }
    emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }
}
