pragma solidity >=0.5.0 <0.6.0;

import "../interface/IRatesProvider.sol";
import "../interface/IOperableCore.sol";


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
    bytes4(keccak256("defineAuditConfiguration(uint256,uint256,bool,uint8,uint8,uint256[],address,bytes32,bool[6])")),
    bytes4(keccak256("defineTokenDelegate(uint256,address,uint256[])"))
  ];

  function hasCoreAccess(IOperableCore _core) public view returns (bool);
  function defineCoreConfigurations(
    address _core,
    address _mintableDelegate,
    address _compliantDelegate,
    IRatesProvider _ratesProvider,
    bytes32 _currency
  ) public returns (bool);
}
