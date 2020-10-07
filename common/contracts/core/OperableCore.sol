pragma solidity ^0.6.0;

import "../interface/IOperableCore.sol";
import "./OperableStorage.sol";
import "./Core.sol";


/**
 * @title OperableCore
 * @dev The Operable contract enable the restrictions of operations to a set of operators
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   OC01: Sender is not a system operator
 *   OC02: Sender is not a core operator
 *   OC03: Sender is not a proxy operator
 *   OC04: AllPrivileges is a reserved role
 *   OC05: AllProxies is not a valid proxy address
 */
contract OperableCore is IOperableCore, Core, OperableStorage {

  constructor(address[] memory _sysOperators) public {
    assignOperators(ALL_PRIVILEGES, _sysOperators);
    assignProxyOperators(ALL_PROXIES, ALL_PRIVILEGES, _sysOperators);
  }

  /**
   * @dev onlySysOp modifier
   * @dev for safety reason, core owner
   * @dev can always define roles and assign or revoke operatos
   */
  modifier onlySysOp() {
    require(msg.sender == owner || hasCorePrivilege(msg.sender, msg.sig), "OC01");
    _;
  }

  /**
   * @dev onlyCoreOp modifier
   */
  modifier onlyCoreOp() {
    require(hasCorePrivilege(msg.sender, msg.sig), "OC02");
    _;
  }

  /**
   * @dev onlyProxyOp modifier
   */
  modifier onlyProxyOp(address _proxy) {
    require(hasProxyPrivilege(msg.sender, _proxy, msg.sig), "OC03");
    _;
  }

  /**
   * @dev defineRoles
   * @param _role operator role
   * @param _privileges as 4 bytes of the method
   */
  function defineRole(bytes32 _role, bytes4[] memory _privileges)
    override public onlySysOp returns (bool)
  {
    require(_role != ALL_PRIVILEGES, "OC04");
    delete roles[_role];
    for (uint256 i=0; i < _privileges.length; i++) {
      roles[_role].privileges[_privileges[i]] = true;
    }
    emit RoleDefined(_role);
    return true;
  }

  /**
   * @dev assignOperators
   * @param _role operator role. May be a role not defined yet.
   * @param _operators addresses
   */
  function assignOperators(bytes32 _role, address[] memory _operators)
    override public onlySysOp returns (bool)
  {
    for (uint256 i=0; i < _operators.length; i++) {
      operators[_operators[i]].coreRole = _role;
      emit OperatorAssigned(_role, _operators[i]);
    }
    return true;
  }

  function defineProxyInternal(address _proxy, uint256 _delegateId)
    override internal returns (bool)
  {
    require(_proxy != ALL_PROXIES, "OC05");
    return super.defineProxyInternal(_proxy, _delegateId);
  }


  /**
   * @dev assignProxyOperators
   * @param _role operator role. May be a role not defined yet.
   * @param _operators addresses
   */
  function assignProxyOperators(
    address _proxy, bytes32 _role, address[] memory _operators)
    override public onlySysOp returns (bool)
  {
    for (uint256 i=0; i < _operators.length; i++) {
      operators[_operators[i]].proxyRoles[_proxy] = _role;
      emit ProxyOperatorAssigned(_proxy, _role, _operators[i]);
    }
    return true;
  }

  /**
   * @dev revokeOperator
   * @param _operators addresses
   */
  function revokeOperators(address[] memory _operators)
    override public onlySysOp returns (bool)
  {
    for (uint256 i=0; i < _operators.length; i++) {
      operators[_operators[i]].coreRole = bytes32(0);
      emit OperatorRevoked(_operators[i]);
    }
    return true;
  }

  /**
   * @dev revokeProxyOperator
   * @param _operators addresses
   */
  function revokeProxyOperators(address _proxy, address[] memory _operators)
    override public onlySysOp returns (bool)
  {
    for (uint256 i=0; i < _operators.length; i++) {
      operators[_operators[i]].proxyRoles[_proxy] = bytes32(0);
      emit ProxyOperatorRevoked(_proxy, _operators[i]);
    }
    return true;
  }
}
