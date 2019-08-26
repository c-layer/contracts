pragma solidity >=0.5.0 <0.6.0;

import "../Storage.sol";


/**
 * @title CounterStorage
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 **/
contract CounterStorage is Storage {

  struct CounterData {
    mapping(address => uint256) count;
    uint256 globalCount;
  }
  mapping(address => CounterData) internal counter;

  function globalCount() public view returns (uint256) {
    return counter[msg.sender].globalCount;
  }

  function globalCountCore(address _counter) public view returns (uint256) {
    return counter[_counter].globalCount;
  }

  function count(address _user) public view returns (uint256) {
    return counter[msg.sender].count[_user];
  }
   
  function countCore(address _counter, address _user) public view returns (uint256) {
    return counter[_counter].count[_user];
  }
}
