pragma solidity ^0.6.0;

import "../operable/OperableAsCore.sol";


/**
 * @title OperableAsCoreMock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract OperableAsCoreMock is OperableAsCore {

  function testOnlyCoreOperator(IOperableCore _core)
    onlyCoreOperator(_core) public view returns (bool)
  {
    return true;
  }

  function testOnlyProxyOperator(IOperableCore _core, address _proxy) 
    onlyProxyOperator(_core, _proxy) public view returns (bool)
  {
    return true;
  }
}
