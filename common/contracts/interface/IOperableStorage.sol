pragma solidity ^0.6.0;

import "../interface/IAccessDefinitions.sol";


/**
 * @title IOperableStorage
 * @dev The Operable storage
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
abstract contract IOperableStorage is IAccessDefinitions {
  function coreRole(address _address) virtual public view returns (bytes32);
  function proxyRole(address _proxy, address _address) virtual public view returns (bytes32);
  function rolePrivilege(bytes32 _role, bytes4 _privilege) virtual public view returns (bool);
  function roleHasPrivilege(bytes32 _role, bytes4 _privilege) virtual public view returns (bool);
  function hasCorePrivilege(address _address, bytes4 _privilege) virtual public view returns (bool);
  function hasProxyPrivilege(address _address, address _proxy, bytes4 _privilege) virtual public view returns (bool);

  event RoleDefined(bytes32 role);
  event OperatorAssigned(bytes32 role, address operator);
  event ProxyOperatorAssigned(address proxy, bytes32 role, address operator);
  event OperatorRevoked(address operator);
  event ProxyOperatorRevoked(address proxy, address operator);

  event ProxyDefined(address proxy, uint256 delegateId);
  event ProxyMigrated(address proxy, address newCore);
  event ProxyRemoved(address proxy);
}
