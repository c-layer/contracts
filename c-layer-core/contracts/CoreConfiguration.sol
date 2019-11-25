pragma solidity >=0.5.0 <0.6.0;

import "./interface/ICoreConfiguration.sol";
import "./operable/OperableAsCore.sol";

/**
 * @title CoreConfiguration
 * @dev CoreConfiguration
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 *   CC01: Some required privileges from the core are missing
 */
contract CoreConfiguration is ICoreConfiguration, OperableAsCore {

  /**
   * @dev constructor
   **/
  constructor(address _core) public OperableAsCore(_core) {}

  /**
   * @dev has core access
   */
  function hasCoreAccess() public view returns (bool access) {
    access = true;
    for (uint256 i=0; i<REQUIRED_CORE_PRIVILEGES.length; i++) {
      access = access && hasCorePrivilege(
        address(this), REQUIRED_CORE_PRIVILEGES[i]);
    }
  }
 
  /**
   * @dev defineAuditConfigurations
   */
  function defineAuditConfigurations() public returns (bool) {
    require(hasCoreAccess(), "CC01");

    // Primary Market AML Configuration
    ITokenCore(address(core)).defineAuditConfiguration(
      uint256(CONFIGURATION.PRIMARY_MARKET_AML),
      ITokenStorage.AuditMode.TRIGGERS_ONLY,
      0, true, // scopeId (core, 0)
      [ false, true, false ], // userData
      [ false, false, false, false, false, true ] // only cumulated reception
    );

    // Secondary Market AML Configuration
    ITokenCore(address(core)).defineAuditConfiguration(
      uint256(CONFIGURATION.SECONDARY_MARKET_AML),
      ITokenStorage.AuditMode.TRIGGERS_EXCLUDED,
      0, true, // scopeId (core, 0)
      [ false, true, false ], // userData
      [ false, false, false, false, false, true ] // only cumulated reception
    );

    // Proof Of Ownership Configuration
    ITokenCore(address(core)).defineAuditConfiguration(
      uint256(CONFIGURATION.PROOF_OF_OWNERSHIP),
      ITokenStorage.AuditMode.ALWAYS,
      0, false, // scopeId (token, 0)
      [ false, false, true ], // addressData
      [ false, true, false, false, false, false ] // only last transaction
    );
  }
}
