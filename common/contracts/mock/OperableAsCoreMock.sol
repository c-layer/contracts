pragma solidity ^0.8.0;

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
    public onlyCoreOperator(_core) view returns (bool)
  {
    return true;
  }

  function testOnlyProxyOperator(Proxy _proxy)
    public onlyProxyOperator(_proxy) view returns (bool)
  {
    return true;
  }
}
