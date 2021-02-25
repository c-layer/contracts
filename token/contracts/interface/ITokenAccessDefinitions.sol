pragma solidity ^0.8.0;

import "@c-layer/common/contracts/interface/IAccessDefinitions.sol";


/**
 * @title ITokenAccessDefinitions
 * @dev ITokenAccessDefinitions
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 */
abstract contract ITokenAccessDefinitions is IAccessDefinitions {

  // Roles
  bytes32 internal constant COMPLIANCE_CORE_ROLE = bytes32("ComplianceCoreRole");
  bytes32 internal constant COMPLIANCE_PROXY_ROLE = bytes32("ComplianceProxyRole");
  bytes32 internal constant ISSUER_PROXY_ROLE = bytes32("IssuerProxyRole");
  bytes32 internal constant OPERATOR_PROXY_ROLE = bytes32("OperatorProxyRole");

  // Addresses
  address internal constant ANY_ADDRESSES = address(0x416e79416464726573736573); // "AnyAddresses"

  // Core Privileges
  bytes4 internal constant DEFINE_CORE_CONFIGURATION_PRIV =
    bytes4(keccak256("defineCoreConfigurations(address,address,address[],address,address,address,address,address)"));
  bytes4 internal constant DEFINE_AUDIT_CONFIGURATION_PRIV =
    bytes4(keccak256("defineAuditConfiguration(uint256,uint256,uint8,uint256[],uint256[],address,address)"));
  bytes4 internal constant DEFINE_TOKEN_DELEGATE_PRIV =
    bytes4(keccak256("defineTokenDelegate(uint256,address,uint256[])"));
  bytes4 internal constant DEFINE_ORACLE_PRIV =
    bytes4(keccak256("defineOracle(address,address,address)"));
  bytes4 internal constant DEFINE_TOKEN_PRIV =
    bytes4(keccak256("defineToken(address,uint256,string,string,uint256)"));
  bytes4 internal constant DEFINE_AUDIT_TRIGGERS_PRIV =
    bytes4(keccak256("defineAuditTriggers(uint256,address[],address[],uint8[])"));

  // Proxy Privileges
  bytes4 internal constant TRANSFER_FROM_PRIV =
    bytes4(keccak256("transferFrom(address,address,uint256)"));
  bytes4 internal constant MINT_PRIV =
    bytes4(keccak256("mint(address,address[],uint256[])"));
  bytes4 internal constant BURN_PRIV =
    bytes4(keccak256("burn(address,uint256)"));
  bytes4 internal constant FINISH_MINTING_PRIV =
    bytes4(keccak256("finishMinting(address)"));
  bytes4 internal constant SEIZE_PRIV =
    bytes4(keccak256("seize(address,address,uint256)"));
  bytes4 internal constant DEFINE_LOCK_PRIV =
    bytes4(keccak256("defineLock(address,address,address,uint64,uint64)"));
  bytes4 internal constant DEFINE_TOKEN_LOCK_PRIV =
    bytes4(keccak256("defineTokenLocks(address,address[])"));
  bytes4 internal constant FREEZE_MANY_ADDRESSES_PRIV =
    bytes4(keccak256("freezeManyAddresses(address,address[],uint256)"));
  bytes4 internal constant DEFINE_RULES_PRIV =
    bytes4(keccak256("defineRules(address,address[])"));

  // Factory prilviieges
  bytes4 internal constant CONFIGURE_TOKENSALES_PRIV =
    bytes4(keccak256("configureTokensales(address,address[],uint256[])"));
  bytes4 internal constant UPDATE_ALLOWANCE_PRIV =
    bytes4(keccak256("updateAllowances(address,address[],uint256[])"));
  bytes4 internal constant DEPLOY_WRAPPED_TOKEN_PRIV =
    bytes4(keccak256("deployWrappedToken(address,string,string,uint256,address[],uint256[],bool)"));
  bytes4 internal constant APPROVE_TOKEN_PRIV =
    bytes4(keccak256("approveToken(address,address)"));
}
