pragma solidity >=0.5.0 <0.6.0;

import "./ITokenCore.sol";


/**
 * @title ICoreConfiguration
 * @dev ICoreConfiguration
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract ICoreConfiguration {

  enum CONFIGURATION {
    PRIMARY_MARKET_AML,
    SECONDARY_MARKET_AML,
    PROOF_OF_OWNERSHIP
  }

  bytes4[] public REQUIRED_CORE_PRIVILEGES = [
    bytes4(keccak256("defineAuditConfiguration(address,bytes32,address[])")),
    bytes4(keccak256("defineAuditTriggers(address,uint256,string,string,uint256)"))
  ];

  function hasCoreAccess() public view returns (bool);
  function configure(ITokenCore _core) public returns (bool);
}
