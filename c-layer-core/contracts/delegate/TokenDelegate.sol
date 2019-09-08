pragma solidity >=0.5.0 <0.6.0;

import "../TokenStorage.sol";
import "../TokenProxy.sol";


/**
 * @title Token Delegate
 * @dev Token Delegate
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * 
 * Error messages
 * TD01: Transfer event must be generated
 */
contract TokenDelegate is TokenStorage {

  /**
   * @dev transfer
   */
  function transfer(
    address _sender, address _to, uint256 _value)
    public returns (bool)
  {
    require(_to != address(0));
    TokenData storage token = tokens_[msg.sender];
    require(_value <= token.balances[_sender]);

    token.balances[_sender] = token.balances[_sender].sub(_value);
    token.balances[_to] = token.balances[_to].add(_value);
    require(
      TokenProxy(msg.sender).emitTransfer(_sender, _to, _value),
      "TD01");
    return true;
  }

  /**
   * @dev transfer fromr
   */
  function transferFrom(
    address _sender, address _from, address _to, uint256 _value)
    public returns (bool)
  {
    require(_to != address(0));
    TokenData storage token = tokens_[msg.sender];
    require(_value <= token.balances[_from]);
    require(_value <= token.allowed[_from][_sender]);

    token.balances[_from] = token.balances[_from].sub(_value);
    token.balances[_to] = token.balances[_to].add(_value);
    token.allowed[_from][_sender] = token.allowed[_from][_sender].sub(_value);
    require(
      TokenProxy(msg.sender).emitTransfer(_from, _to, _value),
      "TD01");
    return true;
  }

  /**
   * @dev approve
   */
  function approve(address _sender, address _spender, uint256 _value)
    public returns (bool)
  {
    TokenData storage token = tokens_[msg.sender];
    token.allowed[_sender][_spender] = _value;
    require(
      TokenProxy(msg.sender).emitApproval(_sender, _spender, _value),
      "TD01");
     return true;
  }

  /**
   * @dev increase approval
   */
  function increaseApproval(address _sender, address _spender, uint _addedValue)
    public returns (bool)
  {
    TokenData storage token = tokens_[msg.sender];
    token.allowed[_sender][_spender] = (
      token.allowed[_sender][_spender].add(_addedValue));
    require(
      TokenProxy(msg.sender).emitApproval(_sender, _spender, token.allowed[_sender][_spender]),
      "TD01");
     return true;
  }

  /**
   * @dev decrease approval
   */
   function decreaseApproval(address _sender, address _spender, uint _subtractedValue)
    public returns (bool)
  {
    TokenData storage token = tokens_[msg.sender];
    uint oldValue = token.allowed[_sender][_spender];
    if (_subtractedValue > oldValue) {
      token.allowed[_sender][_spender] = 0;
    } else {
      token.allowed[_sender][_spender] = oldValue.sub(_subtractedValue);
    }
    require(
      TokenProxy(msg.sender).emitApproval(_sender, _spender, token.allowed[_sender][_spender]),
      "TD01");
     return true;
  }

  /**
   * @dev can transfer
   */
  function canTransfer(address _from, address _to, uint256 _value)
    public view returns (TransferCode)
  {
    if (_to == address(0)) {
      return TransferCode.NO_RECIPIENT;
    }

    TokenData storage token = tokens_[msg.sender];
    if (_value > token.balances[_from]) {
      return TransferCode.INSUFFICIENT_TOKENS;
    }

    return TransferCode.OK;
  }
}
