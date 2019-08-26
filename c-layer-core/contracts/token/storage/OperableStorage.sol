pragma solidity >=0.5.0 <0.6.0;

import "../../util/governance/Ownable.sol";


/**
 * @title OperableStorage
 * @dev The Operable contract enable the restrictions of operations to a set of operators
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 */
contract OperableStorage is Ownable {

  // Hardcoded role granting all privileges
  bytes32 constant ALL_PRIVILEGES = 0x416c6c;

  struct OperatorData {
    bytes32 coreRole;
    mapping(address => bytes32) proxyRole;
  }

  // Mapping address => role
  // Mapping role => bytes4 => bool
  mapping (address => OperatorData) internal operators;
  mapping (bytes32 => mapping(bytes4 => bool)) internal rolePrivileges;

  /**
   * @dev Throws if called by any account other than the operator
   */
  modifier onlyOperator {
    require(hasCorePrivilege(msg.sender, msg.sig), "OP01");
    _;
  }

  /**
   * @dev Throws if called by any account other than the operator
   */
  modifier onlyOperatorWithProxyPrivilege(address _proxy) {
    require(hasProxyPrivilege(msg.sender, _proxy, msg.sig), "OP01");
    _;
  }

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
    return operators[_address].proxyRole[_proxy];
  }

  /**
   * @dev has role privilege
   * @param _address operator address
   */
  function rolePrivilege(bytes32 _role, bytes4 _privilege)
    public view returns (bool)
  {
    return rolePrivileges[_role][_privilege];
  }

  /**
   * @dev hasCorePrivilege
   * @param _address operator address
   */
  function hasCorePrivilege(address _address, bytes4 _privilege) public view returns (bool) {
    OperatorData memory data = operators[_address];
    return (data.coreRole == ALL_PRIVILEGES) || rolePrivileges[data.coreRole];
  }

  /**
   * @dev hasProxyPrivilege
   * @param _address operator address
   */
  function hasProxyPrivilege(address _address, address _proxy, bytes4 _privilege) public view returns (bool) {
    OperatorData memory data = operators[_address];
    bytes32 role = (data.coreRole == bytes32(0)) ?
      data.coreRole : data.proxyRole[_proxy];
    return (role == ALL_PRIVILEGES) || rolePrivileges[role];
  }
}
