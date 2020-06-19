pragma solidity ^0.6.0;

import "../interface/IOperableCore.sol";
import "../core/Proxy.sol";


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

  modifier onlyProxyOperator(Proxy _proxy) {
    IOperableCore core = IOperableCore(_proxy.core());
    require(core.hasProxyPrivilege(
      msg.sender, address(_proxy), msg.sig), "OA02");
    _;
  }
}
