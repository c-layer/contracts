pragma solidity ^0.8.0;

import "./IOperableStorage.sol";


/**
 * @title IOperableCore
 * @dev The Operable contract enable the restrictions of operations to a set of operators
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
abstract contract IOperableCore is IOperableStorage {
  function defineRole(bytes32 _role, bytes4[] memory _privileges) virtual public returns (bool);
  function assignOperators(bytes32 _role, address[] memory _operators) virtual public returns (bool);
  function assignProxyOperators(
    address _proxy, bytes32 _role, address[] memory _operators) virtual public returns (bool);
  function revokeOperators(address[] memory _operators) virtual public returns (bool);
  function revokeProxyOperators(address _proxy, address[] memory _operators) virtual public returns (bool);

  function defineProxy(address _proxy, uint256 _delegateId) virtual public returns (bool);
  function migrateProxy(address _proxy, address _newCore) virtual public returns (bool);
  function removeProxy(address _proxy) virtual public returns (bool);
}
