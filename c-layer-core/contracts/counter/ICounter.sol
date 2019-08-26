pragma solidity >=0.5.0 <0.6.0;


/**
 * @title ICounter
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 **/
contract ICounter {

  function count(address _user) public view returns (uint256);
  function globalCount() public view returns (uint256);

  function increaseCount(uint256 _value) public returns (bool);

}
