pragma solidity >=0.5.0 <0.6.0;

import "../abstract/Storage.sol";
import "../util/governance/Ownable.sol";

/**
 * @title OperableStorage
 * @dev The Operable contract enable the restrictions of operations to a set of operators
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 */
contract OperableStorage is Ownable, Storage {

  // Hardcoded role granting all - non sysop - privileges
  bytes32 constant internal ALL_PRIVILEGES = bytes32("AllPrivileges");
  address constant internal ALL_PROXIES = address(0x416c6c50726f78696573); // "AllProxies"

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
   * @dev core role
   * @param _address operator address
   */
  function coreRole(address _address) public view returns (bytes32) {
    return operators[_address].coreRole;
  }

  /**
   * @dev proxy role
   * @param _address operator address
   */
  function proxyRole(address _proxy, address _address)
    public view returns (bytes32)
  {
    return operators[_address].proxyRoles[_proxy];
  }

  /**
   * @dev has role privilege
   * @dev low level access to role privilege
   * @dev ignores ALL_PRIVILEGES role
   */
  function rolePrivilege(bytes32 _role, bytes4 _privilege)
    public view returns (bool)
  {
    return roles[_role].privileges[_privilege];
  }

  /**
   * @dev roleHasPrivilege
   */
  function roleHasPrivilege(bytes32 _role, bytes4 _privilege) public view returns (bool) {
    return (_role == ALL_PRIVILEGES) || roles[_role].privileges[_privilege];
  }

  /**
   * @dev hasCorePrivilege
   * @param _address operator address
   */
  function hasCorePrivilege(address _address, bytes4 _privilege) public view returns (bool) {
    bytes32 role = operators[_address].coreRole;
    return (role == ALL_PRIVILEGES) || roles[role].privileges[_privilege];
  }

  /**
   * @dev hasProxyPrivilege
   * @dev the default proxy role can be set with proxy address(0)
   * @param _address operator address
   */
  function hasProxyPrivilege(address _address, address _proxy, bytes4 _privilege) public view returns (bool) {
    OperatorData storage data = operators[_address];
    bytes32 role = (data.proxyRoles[_proxy] != bytes32(0)) ?
      data.proxyRoles[_proxy] : data.proxyRoles[ALL_PROXIES];
    return (role == ALL_PRIVILEGES) || roles[role].privileges[_privilege];
  }
}
