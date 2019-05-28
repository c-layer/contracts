pragma solidity >=0.5.0 <0.6.0;

import "../governance/Operable.sol";


/**
 * @title OperableMock
 * @dev Mock the Operable class
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */
contract OperableMock is Operable {

  function testOnlyOperator() public onlyOperator view returns (bool) {
    return true;
  }
}
