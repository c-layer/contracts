pragma solidity >=0.5.0 <0.6.0;


/**
 * @title IOperableCore
 * @dev The Operable contract enable the restrictions of operations to a set of operators
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 */
contract IOperableCore {
  bytes32 constant ALL_PRIVILEGES = bytes32("AllPrivileges");
  address constant ALL_PROXIES = address(0x416c6c50726f78696573); // "AllProxies"

  function coreRole(address _address) public view returns (bytes32);
  function proxyRole(address _proxy, address _address) public view returns (bytes32);
  function rolePrivilege(bytes32 _role, bytes4 _privilege) public view returns (bool);
  function roleHasPrivilege(bytes32 _role, bytes4 _privilege) public view returns (bool);
  function hasCorePrivilege(address _address, bytes4 _privilege) public view returns (bool);
  function hasProxyPrivilege(address _address, address _proxy, bytes4 _privilege) public view returns (bool);

  function defineRole(bytes32 _role, bytes4[] memory _privileges) public returns (bool);
  function assignOperators(bytes32 _role, address[] memory _operators) public returns (bool);
  function assignProxyOperators(
    address _proxy, bytes32 _role, address[] memory _operators) public returns (bool);
  function revokeOperators(address[] memory _operators) public returns (bool);

  event RoleDefined(bytes32 role);
  event OperatorAssigned(bytes32 role, address operator);
  event ProxyOperatorAssigned(address proxy, bytes32 role, address operator);
  event OperatorRevoked(address operator);
}
