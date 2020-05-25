pragma solidity >=0.5.0 <0.6.0;

import "./interface/ICoreConfiguration.sol";
import "./operable/OperableAsCores.sol";


/**
 * @title CoreConfiguration
 * @dev CoreConfiguration
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 *   CC01: Some required privileges from the core are missing
 */
contract CoreConfiguration is ICoreConfiguration, OperableAsCores {

  uint256[] private noAMLConfig = [ uint256(Configuration.PROOF_OF_OWNERSHIP) ];
  uint256[] private primaryMarketAMLConfig = [
    uint256(Configuration.PROOF_OF_OWNERSHIP),
    uint256(Configuration.PRIMARY_MARKET_AML) ];
  uint256[] private secondaryMarketAMLConfig = [
    uint256(Configuration.PROOF_OF_OWNERSHIP),
    uint256(Configuration.SECONDARY_MARKET_AML) ];

  /**
   * @dev has core access
   */
  function hasCoreAccess(IOperableCore _core) public view returns (bool access) {
    access = true;
    for (uint256 i=0; i<requiredCorePrivileges.length; i++) {
      access = access && _core.hasCorePrivilege(
        address(this), requiredCorePrivileges[i]);
    }
  }

   /**
   * @dev defineCoreConfigurations
   */
  function defineCoreConfigurations(
    ITokenCore _core,
    address[] memory _compliances,
    address _mintableDelegate,
    address _compliantDelegate,
    IUserRegistry _userRegistry,
    IRatesProvider _ratesProvider,
    bytes32 _currency
  ) public onlyCoreOperator(_core) returns (bool)
  {
    require(hasCoreAccess(_core), "CC01");

    // Proof Of Ownership Configuration
    uint256[] memory userKeys = new uint256[](0);
    _core.defineAuditConfiguration(
      uint256(Configuration.PROOF_OF_OWNERSHIP),
      0, false, // scopeId (token, 0)
      ITokenStorage.AuditMode.ALWAYS,
      ITokenStorage.AuditStorageMode.ADDRESS,
      new uint256[](0), IRatesProvider(address(0)), '',
      [ false, true, false, false, false, false ] // only last transaction
    );

    // Primary Market AML Configuration
    userKeys = new uint256[](2);
    userKeys[0] = 0;
    userKeys[1] = 2;
    _core.defineAuditConfiguration(
      uint256(Configuration.PRIMARY_MARKET_AML),
      0, true, // scopeId (core, 0)
      ITokenStorage.AuditMode.TRIGGERS_ONLY,
      ITokenStorage.AuditStorageMode.USER_ID,
      userKeys, _ratesProvider, _currency,
      [ false, false, false, false, false, true ] // only cumulated reception
    );

    // Secondary Market AML Configuration
    userKeys = new uint256[](3);
    userKeys[0] = 0;
    userKeys[1] = 1;
    userKeys[2] = 2;
    _core.defineAuditConfiguration(
      uint256(Configuration.SECONDARY_MARKET_AML),
      0, true, // scopeId (core, 0)
      ITokenStorage.AuditMode.TRIGGERS_EXCLUDED,
      ITokenStorage.AuditStorageMode.USER_ID,
      userKeys, _ratesProvider, _currency,
      [ false, false, false, false, false, true ] // only cumulated reception
    );

    _core.defineTokenDelegate(
      uint256(Delegate.UTILITY), _mintableDelegate, noAMLConfig);
    _core.defineTokenDelegate(
      uint256(Delegate.PAYMENT), _mintableDelegate, noAMLConfig);
    _core.defineTokenDelegate(
      uint256(Delegate.SECURITY), _compliantDelegate, primaryMarketAMLConfig);
    _core.defineTokenDelegate(
      uint256(Delegate.EQUITY), _compliantDelegate, secondaryMarketAMLConfig);
    _core.defineTokenDelegate(
      uint256(Delegate.BOND), _compliantDelegate, secondaryMarketAMLConfig);
    _core.defineTokenDelegate(
      uint256(Delegate.FUND), _compliantDelegate, secondaryMarketAMLConfig);
    _core.defineTokenDelegate(
      uint256(Delegate.DERIVATIVE), _compliantDelegate, secondaryMarketAMLConfig);

    bytes4[] memory privileges = new bytes4[](4);
    privileges[0] = DEFINE_RULES_PRIV;
    privileges[1] = SEIZE_PRIV;
    privileges[2] = FREEZE_MANY_ADDRESSES_PRIV;
    privileges[3] = DEFINE_LOCK_PRIV;
    _core.defineRole(COMPLIANCE_PROXY_ROLE, privileges);
    _core.assignProxyOperators(ALL_PROXIES, COMPLIANCE_PROXY_ROLE, _compliances);

    privileges = new bytes4[](5);
    privileges[0] = MINT_PRIV;
    privileges[1] = BURN_PRIV;
    privileges[2] = FINISH_MINTING_PRIV;
    privileges[3] = DEFINE_LOCK_PRIV;
    privileges[4] = DEFINE_CLAIM_PRIV;
    _core.defineRole(ISSUER_PROXY_ROLE, privileges);

    // Assign Oracle
    _core.defineOracle(_userRegistry);
  }
}
