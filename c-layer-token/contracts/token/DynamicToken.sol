pragma solidity >=0.5.0 <0.6.0;

import "./OperableToken.sol";


/**
 * @title DynamicToken
 * @dev DynamicToken contract
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * @dev Work In Progress
 *
 * Error messages
 */
contract DynamicToken is OperableToken {

  struct Phase {
    uint256 ratio;
    uint256 base;
    bool direction;

    uint256 tick;
    uint256 startAt;
    uint256 endAt;
    uint256 createdAt;
    address destination;
  }

  uint256 public phaseCount;
  mapping(uint256 => Phase) phases;
  mapping(address => uint256) updatedAt;

  function balanceOf(address _owner) public view returns (uint256) {
    if(balances[_owner] == 0) return 0;

    uint256 tickCount = (tick > 0) ? (now - updatedAt[_owner]) / tick) : 1;
    if(tickCount == 0) return balances[_owner]);

    uint256 delta;
    if(ratio < base) {

    } else {

    }

    uint256 delta = (decimal + ratio) * tickCount;
    return (_owner == destination) ?
      balances[_owner] + delta : totalSupply - delta;
  }

  function updateBalance(address _owner) public returns (bool) {
    balances[_owner] = balanceOf(_owner);
    updatedAt[_owner] = now;
    return true;
  }

  function transfer(address _to, uint256 _value) public returns (bool) {
    updateBalance(msg.sender);
    updateBalance(_to);
    return super.transfer(_to, _value);
  }

  function transferFrom(address _from, address _to, uint256 _value)
    public returns (bool)
  {
    updateBalance(_from);
    updateBalance(_to);
    return super.transferFrom(_from, _to, _value);
  }
}
