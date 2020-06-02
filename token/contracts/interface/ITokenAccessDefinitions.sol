pragma solidity ^0.6.0;

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
  bytes32 constant COMPLIANCE_CORE_ROLE = bytes32("ComplianceCoreRole");
  bytes32 constant COMPLIANCE_PROXY_ROLE = bytes32("ComplianceProxyRole");
  bytes32 constant ISSUER_PROXY_ROLE = bytes32("IssuerProxyRole");

  // Core Privileges
  bytes4 constant DEFINE_CORE_CONFIGURATION_PRIV =
    bytes4(keccak256("defineCoreConfigurations(address,address,address[],address,address,address,address,bytes32)"));
  bytes4 constant DEFINE_AUDIT_CONFIGURATION_PRIV =
    bytes4(keccak256("defineAuditConfiguration(uint256,uint256,bool,uint8,uint8,uint256[],uint256[],address,bytes32,bool[4])"));
  bytes4 constant DEFINE_TOKEN_DELEGATE_PRIV =
    bytes4(keccak256("defineTokenDelegate(uint256,address,uint256[])"));
  bytes4 constant DEFINE_ORACLE_PRIV =
    bytes4(keccak256("defineOracle(address)"));
  bytes4 constant DEFINE_TOKEN_PRIV =
    bytes4(keccak256("defineToken(address,uint256,string,string,uint256)"));

  // Proxy Privileges
  bytes4 constant MINT_PRIV =
    bytes4(keccak256("mint(address,address[],uint256[])"));
  bytes4 constant BURN_PRIV =
    bytes4(keccak256("burn(address,uint256)"));
  bytes4 constant FINISH_MINTING_PRIV =
    bytes4(keccak256("finishMinting(address)"));
  bytes4 constant SEIZE_PRIV =
    bytes4(keccak256("seize(address,address,uint256)"));
  bytes4 constant DEFINE_LOCK_PRIV =
    bytes4(keccak256("defineLock(address,uint256,uint256,address[])"));
  bytes4 constant FREEZE_MANY_ADDRESSES_PRIV =
    bytes4(keccak256("freezeManyAddresses(address,address[],uint256)"));
  bytes4 constant DEFINE_RULES_PRIV =
    bytes4(keccak256("defineRules(address,address[])"));
  bytes4 constant DEFINE_CLAIM_PRIV =
    bytes4(keccak256("defineClaim(address,address,uint256)"));
}
