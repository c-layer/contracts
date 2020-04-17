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

  uint256[] private userKeys = [ uint256(0), uint256(1), uint256(2) ];

  uint256[] private noAMLConfig = [ uint256(CONFIGURATION.PROOF_OF_OWNERSHIP) ];
  uint256[] private primaryMarketAMLConfig = [
    uint256(CONFIGURATION.PROOF_OF_OWNERSHIP),
    uint256(CONFIGURATION.PRIMARY_MARKET_AML) ];
  uint256[] private secondaryMarketAMLConfig = [
    uint256(CONFIGURATION.PROOF_OF_OWNERSHIP),
    uint256(CONFIGURATION.SECONDARY_MARKET_AML) ];

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
   * @dev defineCoreConfigurations
   */
  function defineCoreConfigurations(
    address _delegate,
    IRatesProvider _ratesProvider,
    bytes32 _currency
  ) public returns (bool)
  {
    require(hasCoreAccess(), "CC01");

    ITokenCore tokenCore = ITokenCore(address(core));

    // Proof Of Ownership Configuration
    tokenCore.defineAuditConfiguration(
      uint256(CONFIGURATION.PROOF_OF_OWNERSHIP),
      0, false, // scopeId (token, 0)
      ITokenStorage.AuditMode.ALWAYS,
      ITokenStorage.AuditStorageMode.ADDRESS,
      new uint256[](0), IRatesProvider(address(0)), '0x0',
      [ false, true, false, false, false, false ] // only last transaction
    );

    // Primary Market AML Configuration
    tokenCore.defineAuditConfiguration(
      uint256(CONFIGURATION.PRIMARY_MARKET_AML),
      0, true, // scopeId (core, 0)
      ITokenStorage.AuditMode.TRIGGERS_ONLY,
      ITokenStorage.AuditStorageMode.USER_ID,
      userKeys, _ratesProvider, _currency,
      [ false, false, false, false, false, true ] // only cumulated reception
    );

    // Secondary Market AML Configuration
    tokenCore.defineAuditConfiguration(
      uint256(CONFIGURATION.SECONDARY_MARKET_AML),
      0, true, // scopeId (core, 0)
      ITokenStorage.AuditMode.TRIGGERS_EXCLUDED,
      ITokenStorage.AuditStorageMode.USER_ID,
      userKeys, _ratesProvider, _currency,
      [ false, false, false, false, false, true ] // only cumulated reception
    );

    tokenCore.defineTokenDelegate(
      uint256(DELEGATE.UTILITY), _delegate, noAMLConfig);
    tokenCore.defineTokenDelegate(
      uint256(DELEGATE.PAYMENT), _delegate, noAMLConfig);
    tokenCore.defineTokenDelegate(
      uint256(DELEGATE.SECURITY), _delegate, primaryMarketAMLConfig);
    tokenCore.defineTokenDelegate(
      uint256(DELEGATE.EQUITY), _delegate, secondaryMarketAMLConfig);
    tokenCore.defineTokenDelegate(
      uint256(DELEGATE.BOND), _delegate, secondaryMarketAMLConfig);
    tokenCore.defineTokenDelegate(
      uint256(DELEGATE.FUND), _delegate, secondaryMarketAMLConfig);
    tokenCore.defineTokenDelegate(
      uint256(DELEGATE.DERIVATIVE), _delegate, secondaryMarketAMLConfig);
  }
}
