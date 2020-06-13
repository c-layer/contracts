pragma solidity ^0.6.0;

import "../interface/IERC20.sol";
import "../math/SafeMath.sol";


/**
 * @title Token ERC20
 * @dev Token ERC20 default implementation
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 */
abstract contract TokenERC20 is IERC20 {
  using SafeMath for uint256;

  string public override name;
  string public override symbol;
  uint256 public override decimals;

  uint256 public override totalSupply;
  mapping(address => uint256) internal _balances;
  mapping (address => mapping (address => uint256)) internal _allowed;

  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    address _initialAccount,
    uint256 _initialSupply
  ) public {
    name = _name;
    symbol = _symbol;
    decimals = _decimals;
    totalSupply= _initialSupply;
    _balances[_initialAccount] = _initialSupply;

    emit Transfer(address(0), _initialAccount, _initialSupply);
  }
  
  function balanceOf(address _owner) override public view returns (uint256) {
    return _balances[_owner];
  }

  function allowance(address _owner, address _spender)
    override public view returns (uint256)
  {
    return _allowed[_owner][_spender];
  }

  function transfer(address _to, uint256 _value) override public returns (bool) {
    require(_to != address(0));
    require(_value <= _balances[msg.sender]);

    _balances[msg.sender] = _balances[msg.sender].sub(_value);
    _balances[_to] = _balances[_to].add(_value);
    emit Transfer(msg.sender, _to, _value);
    return true;
  }

  function transferFrom(address _from, address _to, uint256 _value)
    override public returns (bool)
  {
    require(_to != address(0));
    require(_value <= _balances[_from]);
    require(_value <= _allowed[_from][msg.sender]);

    _balances[_from] = _balances[_from].sub(_value);
    _balances[_to] = _balances[_to].add(_value);
    _allowed[_from][msg.sender] = _allowed[_from][msg.sender].sub(_value);
    emit Transfer(_from, _to, _value);
    return true;
  }

  function approve(address _spender, uint256 _value) override public returns (bool) {
    _allowed[msg.sender][_spender] = _value;
    emit Approval(msg.sender, _spender, _value);
    return true;
  }

  function increaseApproval(address _spender, uint _addedValue)
    override public returns (bool)
  {
    _allowed[msg.sender][_spender] = (
      _allowed[msg.sender][_spender].add(_addedValue));
    emit Approval(msg.sender, _spender, _allowed[msg.sender][_spender]);
    return true;
  }

  function decreaseApproval(address _spender, uint _subtractedValue)
    override public returns (bool)
  {
    uint oldValue = _allowed[msg.sender][_spender];
    if (_subtractedValue > oldValue) {
      _allowed[msg.sender][_spender] = 0;
    } else {
      _allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
    }
    emit Approval(msg.sender, _spender, _allowed[msg.sender][_spender]);
    return true;
  }

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(
    address indexed owner,
    address indexed spender,
    uint256 value
  );

}
