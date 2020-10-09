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

  struct RoleData {
    mapping(bytes4 => bool) privileges;
  }

  struct OperatorData {
    bytes32 coreRole;
    mapping(address => bytes32) proxyRoles;
  }

  // Mapping address => role
  // Mapping role => bytes4 => bool
  mapping (address => OperatorData) internal operators;
  mapping (bytes32 => RoleData) internal roles;

  /**
   * @dev proxyDelegateId
   */
  function proxyDelegateId(address _proxy) override public view returns (uint256) {
    return proxyDelegateIds[_proxy];
  }

  /**
   * @dev delegate
   */
  function delegate(uint256 _delegateId) override public view returns (address) {
    return delegates[_delegateId];
  }

  /**
   * @dev core role
   * @param _address operator address
   */
  function coreRole(address _address) override public view returns (bytes32) {
    return operators[_address].coreRole;
  }

  /**
   * @dev proxy role
   * @param _address operator address
   */
  function proxyRole(address _proxy, address _address)
    override public view returns (bytes32)
  {
    return operators[_address].proxyRoles[_proxy];
  }

  /**
   * @dev has role privilege
   * @dev low level access to role privilege
   * @dev ignores ALL_PRIVILEGES role
   */
  function rolePrivilege(bytes32 _role, bytes4 _privilege)
    override public view returns (bool)
  {
    return roles[_role].privileges[_privilege];
  }

  /**
   * @dev roleHasPrivilege
   */
  function roleHasPrivilege(bytes32 _role, bytes4 _privilege) override public view returns (bool) {
    return (_role == ALL_PRIVILEGES) || roles[_role].privileges[_privilege];
  }

  /**
   * @dev hasCorePrivilege
   * @param _address operator address
   */
  function hasCorePrivilege(address _address, bytes4 _privilege) override public view returns (bool) {
    bytes32 role = operators[_address].coreRole;
    return (role == ALL_PRIVILEGES) || roles[role].privileges[_privilege];
  }

  /**
   * @dev hasProxyPrivilege
   * @dev the default proxy role can be set with proxy address(0)
   * @param _address operator address
   */
  function hasProxyPrivilege(address _address, address _proxy, bytes4 _privilege) override public view returns (bool) {
    OperatorData storage data = operators[_address];
    bytes32 role = (data.proxyRoles[_proxy] != bytes32(0)) ?
      data.proxyRoles[_proxy] : data.proxyRoles[ALL_PROXIES];
    return (role == ALL_PRIVILEGES) || roles[role].privileges[_privilege];
  }
}
