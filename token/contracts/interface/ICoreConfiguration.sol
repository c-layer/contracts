pragma solidity ^0.6.0;

import "@c-layer/common/contracts/interface/IOperableCore.sol";
import "@c-layer/oracle/contracts/interface/IUserRegistry.sol";
import "@c-layer/oracle/contracts/interface/IRatesProvider.sol";
import "../interface/ITokenAccessDefinitions.sol";
import "../interface/ITokenCore.sol";


/**
 * @title ICoreConfiguration
 * @dev ICoreConfiguration
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 */
abstract contract ICoreConfiguration is ITokenAccessDefinitions {

  enum Configuration {
    NO_AUDITS,
    PROOF_OF_OWNERSHIP,
    AML_PRIMARY,
    AML_FULL
  }

  enum Delegate {
    UNDEFINED,
    UTILITY,
    PAYMENT,
    SECURITY,
    EQUITY,
    BOND,
    FUND,
    DERIVATIVE
  }

  // The definition below should be considered as a constant
  // Solidity 0.6.x do not provide ways to have arrays as constants
  bytes4[] public requiredCorePrivileges = [
    DEFINE_CORE_CONFIGURATION_PRIV,
    DEFINE_AUDIT_CONFIGURATION_PRIV,
    DEFINE_TOKEN_DELEGATE_PRIV,
    DEFINE_ROLE_PRIV,
    ASSIGN_OPERATORS_PRIV,
    REVOKE_OPERATORS_PRIV,
    ASSIGN_PROXY_OPERATORS_PRIV,
    DEFINE_ORACLE_PRIV
  ];

  function hasCoreAccess(IOperableCore _core) virtual public view returns (bool);
  function defineCoreConfigurations(
    ITokenCore _core,
    address[] calldata _factories,
    address _mintableDelegate,
    address _compliantDelegate,
    IUserRegistry _userRegistry,
    IRatesProvider _ratesProvider,
    address _currency
  ) virtual external returns (bool);
}
