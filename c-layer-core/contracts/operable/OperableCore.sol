pragma solidity >=0.5.0 <0.6.0;

import "./OperableStorage.sol";
import "../abstract/Core.sol";


/**
 * @title OperableCore
 * @dev The Operable contract enable the restrictions of operations to a set of operators
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 *   OC01: Sender is not a system operator
 *   OC02: Sender is not a core operator
 *   OC03: Sender is not a proxy operator
 *   OC04: AllPrivileges is a reserved role
 */
contract OperableCore is Core, OperableStorage {

  constructor() public {
    operators[msg.sender].coreRole = ALL_PRIVILEGES;
    operators[msg.sender].proxyRoles[ALL_PROXIES] = ALL_PRIVILEGES;
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
   * @param _privileges operator address
   */
  function defineRole(bytes32 _role, bytes4[] memory _privileges)
    public onlySysOp returns (bool)
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
   * @dev aasignOperators
   * @param _role operator role
   * @param _operators addresses
   */
  function assignOperators(bytes32 _role, address[] memory _operators)
    public onlySysOp returns (bool)
  {
    for (uint256 i=0; i < _operators.length; i++) {
      operators[_operators[i]].coreRole = _role;
      emit OperatorAssigned(_role, _operators[i]);
    }
    return true;
  }

  /**
   * @dev assignProxyOperators
   * @param _role operator role
   * @param _operators addresses
   */
  function assignProxyOperators(
    address _proxy, bytes32 _role, address[] memory _operators)
    public onlySysOp returns (bool)
  {
    for (uint256 i=0; i < _operators.length; i++) {
      operators[_operators[i]].proxyRoles[_proxy] = _role;
      emit ProxyOperatorAssigned(_proxy, _role, _operators[i]);
    }
    return true;
  }

  /**
   * @dev removeOperator
   * @param _operators addresses
   */
  function revokeOperators(address[] memory _operators)
    public onlySysOp returns (bool)
  {
    for (uint256 i=0; i < _operators.length; i++) {
      delete operators[_operators[i]];
      emit OperatorRevoked(_operators[i]);
    }
    return true;
  }

  event RoleDefined(bytes32 role);
  event OperatorAssigned(bytes32 role, address operator);
  event ProxyOperatorAssigned(address proxy, bytes32 role, address operator);
  event OperatorRevoked(address operator);
}
