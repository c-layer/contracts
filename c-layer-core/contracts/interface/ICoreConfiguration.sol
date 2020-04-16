pragma solidity >=0.5.0 <0.6.0;

import "./ITokenCore.sol";


/**
 * @title ICoreConfiguration
 * @dev ICoreConfiguration
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract ICoreConfiguration {

  enum CONFIGURATION {
    PROOF_OF_OWNERSHIP,
    PRIMARY_MARKET_AML,
    SECONDARY_MARKET_AML
  }

  enum DELEGATE {
    UNDEFINED,
    UTILITY,
    PAYMENT,
    SECURITY,
    EQUITY,
    BOND,
    FUND,
    DERIVATIVE
  }

  bytes4[] public REQUIRED_CORE_PRIVILEGES = [
    bytes4(keccak256("defineAuditConfiguration(address,bytes32,address[])")),
    bytes4(keccak256("defineAuditTriggers(address,uint256,string,string,uint256)"))
  ];

  function hasCoreAccess() public view returns (bool);
  function defineCoreConfigurations(
    address _delegate,
    IRatesProvider _ratesProvider,
    bytes32 _currency
  ) public returns (bool);
}
