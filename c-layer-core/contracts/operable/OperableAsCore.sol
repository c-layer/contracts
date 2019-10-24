pragma solidity >=0.5.0 <0.6.0;

import "../interface/IOperableCore.sol";


/**
 * @title TokenFactory
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 *   OA01: Missing the core privilege
 *   OA02: Missing the proxy privilege
 **/
contract OperableAsCore {

  IOperableCore public core;

  modifier onlyCoreOperator() {
    require(core.hasCorePrivilege(
      msg.sender, msg.sig), "OA01");
    _;
  }

  modifier onlyProxyOperator(address _proxy) {
    require(core.hasProxyPrivilege(
      msg.sender, _proxy, msg.sig), "OA02");
    _;
  }

  /**
   * @dev constructor
   **/
  constructor(address _core) public {
    core = IOperableCore(_core);
  }

  /**
   * @dev hasCorePrivilege
   */
  function hasCorePrivilege(address _operator, bytes4 _privilege)
    public view returns (bool)
  {
    return core.hasCorePrivilege(_operator, _privilege);
  }

  /**
   * @dev hasProxyPrivilege
   */
  function hasProxyPrivilege(address _operator, address _proxy, bytes4 _privilege)
    public view returns (bool)
  {
    return core.hasProxyPrivilege(_operator, _proxy, _privilege);
  }
}
