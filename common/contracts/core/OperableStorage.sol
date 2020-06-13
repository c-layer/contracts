pragma solidity ^0.6.0;

import "../interface/IOperableStorage.sol";
import "../operable/Ownable.sol";
import "./Storage.sol";


/**
 * @title OperableStorage
 * @dev The Operable contract enable the restrictions of operations to a set of operators
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract OperableStorage is IOperableStorage, Ownable, Storage {

  // Mapping address => role
  // Mapping role => bytes4 => bool
  mapping (address => OperatorData) internal _operators;
  mapping (bytes32 => RoleData) internal _roles;

  /**
   * @dev core role
   * @param _address operator address
   */
  function coreRole(address _address) override public view returns (bytes32) {
    return _operators[_address].coreRole;
  }

  /**
   * @dev proxy role
   * @param _address operator address
   */
  function proxyRole(address _proxy, address _address)
    override public view returns (bytes32)
  {
    return _operators[_address].proxyRoles[_proxy];
  }

  /**
   * @dev has role privilege
   * @dev low level access to role privilege
   * @dev ignores ALL_PRIVILEGES role
   */
  function rolePrivilege(bytes32 _role, bytes4 _privilege)
    override public view returns (bool)
  {
    return _roles[_role].privileges[_privilege];
  }

  /**
   * @dev roleHasPrivilege
   */
  function roleHasPrivilege(bytes32 _role, bytes4 _privilege) override public view returns (bool) {
    return (_role == _ALL_PRIVILEGES) || _roles[_role].privileges[_privilege];
  }

  /**
   * @dev hasCorePrivilege
   * @param _address operator address
   */
  function hasCorePrivilege(address _address, bytes4 _privilege) override public view returns (bool) {
    bytes32 role = _operators[_address].coreRole;
    return (role == _ALL_PRIVILEGES) || _roles[role].privileges[_privilege];
  }

  /**
   * @dev hasProxyPrivilege
   * @dev the default proxy role can be set with proxy address(0)
   * @param _address operator address
   */
  function hasProxyPrivilege(address _address, address _proxy, bytes4 _privilege) override public view returns (bool) {
    OperatorData storage data = _operators[_address];
    bytes32 role = (data.proxyRoles[_proxy] != bytes32(0)) ?
      data.proxyRoles[_proxy] : data.proxyRoles[_ALL_PROXIES];
    return (role == _ALL_PRIVILEGES) || _roles[role].privileges[_privilege];
  }
}
