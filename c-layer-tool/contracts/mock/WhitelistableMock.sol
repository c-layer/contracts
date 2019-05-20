pragma solidity >=0.5.0 <0.6.0;

import "../Whitelistable.sol";


/**
 * @title WhitelistableMock
 * @dev WhitelistableMock contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */
contract WhitelistableMock is Whitelistable {

  bool public success;
  
  function testMe() public onlyWhitelisted(msg.sender) {
    success = true; 
  }
}
