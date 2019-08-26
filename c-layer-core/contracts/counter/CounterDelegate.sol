pragma solidity >=0.5.0 <0.6.0;

import "../Delegate.sol";
import "./CounterStorage.sol";


/**
 * @title CounterDelegate
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 **/
contract CounterDelegate is Delegate, CounterStorage {

  constructor() public {
  }

  function self() public view returns (address) {
    return address(this);
  }

  function increaseCount(
    uint256 _value,
    address _user
  ) public returns (bool)
  {
    counter[address(this)].count[_user] += _value;
    counter[msg.sender].count[_user] += _value;
    counter[address(this)].globalCount += _value;
    counter[msg.sender].globalCount += _value;

    emit CounterIncreased(_user, _value);
    return true;
  }

  event CounterIncreased(address user, uint256 value);
}
