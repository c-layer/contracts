pragma solidity >=0.5.0 <0.6.0;

import "../interface/IRatesProvider.sol";
import "../interface/IUserRegistry.sol";
import "../interface/IOperableCore.sol";
import "../interface/IAccessDefinitions.sol";
import "../interface/ITokenCore.sol";


/**
 * @title ICoreConfiguration
 * @dev ICoreConfiguration
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract ICoreConfiguration is IAccessDefinitions {

  enum Configuration {
    PROOF_OF_OWNERSHIP,
    PRIMARY_MARKET_AML,
    SECONDARY_MARKET_AML
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

  function hasCoreAccess(IOperableCore _core) public view returns (bool);
  function defineCoreConfigurations(
    ITokenCore _core,
    address[] memory _compliances,
    address _mintableDelegate,
    address _compliantDelegate,
    IUserRegistry _userRegistry,
    IRatesProvider _ratesProvider,
    bytes32 _currency
  ) public returns (bool);
}
