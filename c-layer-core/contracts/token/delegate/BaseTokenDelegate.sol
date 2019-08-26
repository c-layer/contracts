pragma solidity >=0.5.0 <0.6.0;

import "../storage/BaseTokenStorage.sol";
import "../interface/IBaseTokenCore.sol";


/**
 * @title BaseToken Delegate
 * @dev BaseToken Delegate
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract BaseTokenDelegate is IBaseTokenCore, BaseTokenStorage {

  function transfer(
    address _sender, address _to, uint256 _value)
    public returns (bool)
  {
    require(_to != address(0));
    BaseTokenData storage token = baseTokens[msg.sender];
    require(_value <= token.balances[_sender]);

    token.balances[_sender] = token.balances[_sender].sub(_value);
    token.balances[_to] = token.balances[_to].add(_value);
    return true;
  }

  function transferFrom(
    address _sender, address _from, address _to, uint256 _value)
    public returns (bool)
  {
    require(_to != address(0));
    BaseTokenData storage token = baseTokens[msg.sender];
    require(_value <= token.balances[_from]);
    require(_value <= token.allowed[_from][_sender]);

    token.balances[_from] = token.balances[_from].sub(_value);
    token.balances[_to] = token.balances[_to].add(_value);
    token.allowed[_from][_sender] = token.allowed[_from][_sender].sub(_value);
    return true;
  }

  function approve(address _sender, address _spender, uint256 _value)
    public returns (bool)
  {
    BaseTokenData storage token = baseTokens[msg.sender];
    token.allowed[_sender][_spender] = _value;
    return true;
  }

  function increaseApproval(address _sender, address _spender, uint _addedValue)
    public returns (bool)
  {
    BaseTokenData storage token = baseTokens[msg.sender];
    token.allowed[_sender][_spender] = (
      token.allowed[_sender][_spender].add(_addedValue));
    return true;
  }

  function decreaseApproval(address _sender, address _spender, uint _subtractedValue)
    public returns (bool)
  {
    BaseTokenData storage token = baseTokens[msg.sender];
    uint oldValue = token.allowed[_sender][_spender];
    if (_subtractedValue > oldValue) {
      token.allowed[_sender][_spender] = 0;
    } else {
      token.allowed[_sender][_spender] = oldValue.sub(_subtractedValue);
    }
    return true;
  }
}
