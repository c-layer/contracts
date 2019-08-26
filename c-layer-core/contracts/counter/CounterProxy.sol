pragma solidity >=0.5.0 <0.6.0;

import "../Proxy.sol";
import "./CounterCore.sol";
import "./ICounter.sol";


/**
 * @title CounterProxy
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 **/
contract CounterProxy is ICounter, Proxy {

  constructor(address _core) Proxy(_core) public { }

  function count(address _user) public view returns (uint256) {
    return CounterCore(core).count(_user);
  }

  function globalCount() public view returns (uint256) {
    return CounterCore(core).globalCount();
  }

  function increaseCount(uint256 _value) public returns (bool) {
    return CounterCore(core).increaseCount(_value, msg.sender);
  }

  function increaseCountNoDelegate(uint256 _value) public returns (bool) {
    return CounterCore(core).increaseCountNoDelegate(_value, msg.sender);
  }
}
