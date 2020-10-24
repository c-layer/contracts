pragma solidity ^0.6.0;

import "@c-layer/common/contracts/math/SafeMath.sol";
import "@c-layer/common/contracts/core/OperableStorage.sol";
import "./interface/IRule.sol";
import "./interface/ITokenStorage.sol";


/**
 * @title Token storage
 * @dev Token storage
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 */
contract TokenStorage is ITokenStorage, OperableStorage {
  using SafeMath for uint256;

  struct Lock {
    uint256 startAt;
    uint256 endAt;
    mapping(address => bool) exceptions;
    address[] exceptionsList;
  }

  struct TokenData {
    string name;
    string symbol;
    uint256 decimals;

    uint256 totalSupply;
    mapping (address => uint256) balances;
    mapping (address => mapping (address => uint256)) allowances;

    bool mintingFinished;

    uint256 allTimeMinted;
    uint256 allTimeBurned;
    uint256 allTimeSeized;

    mapping (address => uint256) frozenUntils;
    address[] locks;
    IRule[] rules;
  }

  struct AuditData {
    uint64 createdAt;
    uint64 lastTransactionAt;
    uint256 cumulatedEmission;
    uint256 cumulatedReception;
  }

  struct AuditStorage {
    address currency;

    AuditData sharedData;
    mapping(uint256 => AuditData) userData;
    mapping(address => AuditData) addressData;
  }

  struct AuditConfiguration {
    uint256 scopeId;

    uint256[] senderKeys;
    uint256[] receiverKeys;
    IRatesProvider ratesProvider;

    mapping (address => mapping(address => AuditTriggerMode)) triggers;
  }

  // AuditConfigurationId => AuditConfiguration
  mapping (uint256 => AuditConfiguration) internal auditConfigurations;
  // DelegateId => AuditConfigurationId[]
  mapping (uint256 => uint256[]) internal delegatesConfigurations_;
  mapping (address => TokenData) internal tokens;

  // Scope x ScopeId => AuditStorage
  mapping (address => mapping (uint256 => AuditStorage)) internal audits;

  // Prevents operator to act on behalf
  mapping (address => bool) internal selfManaged;

  mapping (address => Lock) internal locks;

  IUserRegistry internal userRegistry_;
  IRatesProvider internal ratesProvider_;
  address internal currency_;
  string internal name_;

  /**
   * @dev currentTime()
   */
  function currentTime() internal view returns (uint64) {
    // solhint-disable-next-line not-rely-on-time
    return uint64(now);
  }
}
