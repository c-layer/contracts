pragma solidity >=0.5.0 <0.6.0;


/**
 * @title IAccessDefinitions
 * @dev IAccessDefinitions
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract IAccessDefinitions {

  bytes32 constant ALL_PRIVILEGES = bytes32("AllPrivileges");
  address constant ALL_PROXIES = address(0x416c6C50726F78696573); // "AllProxies"

  // Roles
  bytes32 constant FACTORY_CORE_ROLE = bytes32("FactoryCoreRole");
  bytes32 constant FACTORY_PROXY_ROLE = bytes32("FactoryProxyRole");
  bytes32 constant COMPLIANCE_CORE_ROLE = bytes32("ComplianceCoreRole");
  bytes32 constant COMPLIANCE_PROXY_ROLE = bytes32("ComplianceProxyRole");
  bytes32 constant ISSUER_PROXY_ROLE = bytes32("IssuerProxyRole");

  // Sys Privileges
  bytes4 constant DEFINE_ROLE_PRIV =
    bytes4(keccak256("defineRole(bytes32,bytes4[])"));
  bytes4 constant ASSIGN_OPERATORS_PRIV =
    bytes4(keccak256("assignOperators(bytes32,address[])"));
  bytes4 constant REVOKE_OPERATORS_PRIV =
    bytes4(keccak256("revokeOperators(address[])"));
  bytes4 constant ASSIGN_PROXY_OPERATORS_PRIV =
    bytes4(keccak256("assignProxyOperators(address,bytes32,address[])"));

  // Core Privileges
  bytes4 constant DEFINE_CORE_CONFIGURATION_PRIV =
    bytes4(keccak256("defineCoreConfigurations(address,address,address[],address,address,address,address,bytes32)"));
  bytes4 constant DEFINE_AUDIT_CONFIGURATION_PRIV =
    bytes4(keccak256("defineAuditConfiguration(uint256,uint256,bool,uint8,uint8,uint256[],address,bytes32,bool[6])"));
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
