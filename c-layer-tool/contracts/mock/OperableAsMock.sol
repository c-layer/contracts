pragma solidity >=0.5.0 <0.6.0;

import "../governance/OperableAs.sol";


/**
 * @title OperableAsMock
 * @dev Mock the OperableAs class
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */
contract OperableAsMock is OperableAs {

  constructor(Operable _operable) public OperableAs(_operable)
  {} // solhint-disable-line no-empty-blocks

  function testOnlyOperator() public onlyOperator view returns (bool) {
    return true;
  }
}
