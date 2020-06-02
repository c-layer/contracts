pragma solidity ^0.6.0;

import "../interface/IOperableCore.sol";


/**
 * @title OperableAsCore
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   OA01: Missing the core privilege
 *   OA02: Missing the proxy privilege
 **/
contract OperableAsCore {

  modifier onlyCoreOperator(IOperableCore _core) {
    require(_core.hasCorePrivilege(
      msg.sender, msg.sig), "OA01");
    _;
  }

  modifier onlyProxyOperator(IOperableCore _core, address _proxy) {
    require(_core.hasProxyPrivilege(
      msg.sender, _proxy, msg.sig), "OA02");
    _;
  }
}
