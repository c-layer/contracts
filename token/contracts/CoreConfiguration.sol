pragma solidity ^0.6.0;

import "@c-layer/common/contracts/operable/OperableAsCore.sol";
import "./interface/ICoreConfiguration.sol";


/**
 * @title CoreConfiguration
 * @dev CoreConfiguration
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   CC01: Some required privileges from the core are missing
 *   CC02: Proof of ownership audit configuration setup failed
 *   CC03: Primary market audit configuration setup failed
 *   CC04: Secondary market audit configuration setup failed
 *   CC05: Utility token delegate setup failed
 *   CC06: Payment token delegate setup failed
 *   CC07: Security token delegate setup failed
 *   CC08: Equity token delegate setup failed
 *   CC09: Bond token delegate setup failed
 *   CC10: Fund token delegate setup failed
 *   CC11: Derivative token delegate setup failed
 *   CC12: Factory core role definition failed
 *   CC13: Factory core role assignment failed
 *   CC14: Factory proxy role definition failed
 *   CC15: Factory proxy role assignment failed
 *   CC16: Compliance core role definition failed
 *   CC17: Compliance proxy role definition failed
 *   CC18: Issuer proxy role definition failed
 *   CC19: Oracle definition failed
 *   CC20: Revoking core configuration access failed
 *   CC21: Revoking access from the core configuration was successfull
 */
contract CoreConfiguration is ICoreConfiguration, OperableAsCore {

  uint256[] private noAMLConfig = [ uint256(Configuration.PROOF_OF_OWNERSHIP) ];
  uint256[] private primaryMarketAMLConfig = [
    uint256(Configuration.PROOF_OF_OWNERSHIP),
    uint256(Configuration.AML_PRIMARY) ];
  uint256[] private secondaryMarketAMLConfig = [
    uint256(Configuration.PROOF_OF_OWNERSHIP),
    uint256(Configuration.AML_FULL) ];

  /**
   * @dev has core access
   */
  function hasCoreAccess(IOperableCore _core) override public view returns (bool access) {
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
    address[] memory _factories,
    address _mintableDelegate,
    address _compliantDelegate,
    IUserRegistry _userRegistry,
    IRatesProvider _ratesProvider,
    bytes32 _currency
  ) override public onlyCoreOperator(_core) returns (bool)
  {
    require(hasCoreAccess(_core), "CC01");
    uint256[] memory emptyArray = new uint256[](0);
    uint256[] memory senderKeys = new uint256[](1);
    senderKeys[0] = uint256(IUserRegistry.KeyCode.EMISSION_LIMIT_KEY);
    uint256[] memory receiverKeys = new uint256[](1);
    receiverKeys[0] = uint256(IUserRegistry.KeyCode.RECEPTION_LIMIT_KEY);

    // Proof Of Ownership Configuration
    require(_core.defineAuditConfiguration(
      uint256(Configuration.PROOF_OF_OWNERSHIP),
      uint256(ITokenStorage.Scope.DEFAULT), false, // scopeId (token, default)
      ITokenStorage.AuditMode.ALWAYS,
      ITokenStorage.AuditStorageMode.ADDRESS,
      emptyArray, emptyArray, IRatesProvider(address(0)), '',
      [ false, true, false, false ] // only last transaction
    ), "CC02");

    // Primary Market AML Configuration
    require(_core.defineAuditConfiguration(
      uint256(Configuration.AML_PRIMARY),
      uint256(ITokenStorage.Scope.DEFAULT), true, // scopeId (core, default)
      ITokenStorage.AuditMode.WHEN_TRIGGERS_MATCHED,
      ITokenStorage.AuditStorageMode.USER_ID,
      emptyArray, receiverKeys, _ratesProvider, _currency,
      [ false, false, false, true ] // only cumulated reception
    ), "CC03");

    // Secondary Market AML Configuration
    require(_core.defineAuditConfiguration(
      uint256(Configuration.AML_FULL),
      uint256(ITokenStorage.Scope.DEFAULT), true, // scopeId (core, default)
      ITokenStorage.AuditMode.ALWAYS_TRIGGERS_EXCLUDED,
      ITokenStorage.AuditStorageMode.USER_ID,
      senderKeys, receiverKeys, _ratesProvider, _currency,
      [ true, false, true, true ] // only cumulated reception
    ), "CC04");

    require(_core.defineTokenDelegate(
      uint256(Delegate.UTILITY), _mintableDelegate, noAMLConfig), "CC05");
    require(_core.defineTokenDelegate(
      uint256(Delegate.PAYMENT), _mintableDelegate, noAMLConfig), "CC06");
    require(_core.defineTokenDelegate(
      uint256(Delegate.SECURITY), _compliantDelegate, primaryMarketAMLConfig), "CC07");
    require(_core.defineTokenDelegate(
      uint256(Delegate.EQUITY), _compliantDelegate, secondaryMarketAMLConfig), "CC08");
    require(_core.defineTokenDelegate(
      uint256(Delegate.BOND), _compliantDelegate, secondaryMarketAMLConfig), "CC09");
    require(_core.defineTokenDelegate(
      uint256(Delegate.FUND), _compliantDelegate, secondaryMarketAMLConfig), "CC10");
    require(_core.defineTokenDelegate(
      uint256(Delegate.DERIVATIVE), _compliantDelegate, secondaryMarketAMLConfig), "CC11");

    // Setup basic roles
    bytes4[] memory privileges = new bytes4[](2);
    privileges[0] = ASSIGN_PROXY_OPERATORS_PRIV;
    privileges[1] = DEFINE_TOKEN_PRIV;
    require(_core.defineRole(FACTORY_CORE_ROLE, privileges), "CC12");
    require(_core.assignOperators(FACTORY_CORE_ROLE, _factories), "CC13");

    privileges = new bytes4[](4);
    privileges[0] = MINT_PRIV;
    privileges[1] = FINISH_MINTING_PRIV;
    privileges[2] = DEFINE_RULES_PRIV;
    privileges[3] = DEFINE_LOCK_PRIV;
    require(_core.defineRole(FACTORY_PROXY_ROLE, privileges), "CC14");
    require(_core.assignProxyOperators(ALL_PROXIES, FACTORY_PROXY_ROLE, _factories), "CC15");

    privileges = new bytes4[](1);
    privileges[0] = DEFINE_TOKEN_PRIV;
    require(_core.defineRole(COMPLIANCE_CORE_ROLE, privileges), "CC16");

    privileges = new bytes4[](4);
    privileges[0] = DEFINE_RULES_PRIV;
    privileges[1] = SEIZE_PRIV;
    privileges[2] = FREEZE_MANY_ADDRESSES_PRIV;
    privileges[3] = DEFINE_LOCK_PRIV;
    require(_core.defineRole(COMPLIANCE_PROXY_ROLE, privileges), "CC17");

    privileges = new bytes4[](5);
    privileges[0] = MINT_PRIV;
    privileges[1] = BURN_PRIV;
    privileges[2] = FINISH_MINTING_PRIV;
    privileges[3] = DEFINE_LOCK_PRIV;
    privileges[4] = DEFINE_CLAIM_PRIV;
    require(_core.defineRole(ISSUER_PROXY_ROLE, privileges), "CC18");

    // Assign Oracle
    require(_core.defineOracle(_userRegistry), "CC19");

    address[] memory configOperators = new address[](1);
    configOperators[0] = address(this);
    require(_core.revokeOperators(configOperators), "CC20");
    require(!hasCoreAccess(_core), "CC21");
  }
}
