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

  struct Proof {
    uint256 amount;
    uint64 startAt;
    uint64 endAt;
  }

  struct Lock {
    uint256 startAt;
    uint256 endAt;
    mapping(address => bool) exceptions;
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

    mapping (address => Proof[]) proofs;
    mapping (address => uint256) frozenUntils;

    Lock lock;
    IRule[] rules;
    uint256 latestClaimAt;
  }

  struct AuditData {
    uint64 createdAt;
    uint64 lastTransactionAt;
    uint256 cumulatedEmission;
    uint256 cumulatedReception;
  }

  struct AuditStorage {
    bytes32 currency;

    AuditData sharedData;
    mapping(uint256 => AuditData) userData;
    mapping(address => AuditData) addressData;
  }

  struct AuditConfiguration {
    uint256 scopeId;
    bool scopeCore;

    AuditMode mode;
    AuditStorageMode storageMode;

    uint256[] senderKeys;
    uint256[] receiverKeys;
    IRatesProvider ratesProvider;
    bytes32 currency;

    bool fieldCreatedAt;
    bool fieldLastTransactionAt;
    bool fieldCumulatedEmission;
    bool fieldCumulatedReception;

    mapping (address => bool) triggerSenders;
    mapping (address => bool) triggerReceivers;
    mapping (address => bool) triggerTokens;
  }

  // DelegateId => AuditConfiguration[]
  mapping (uint256 => AuditConfiguration) internal auditConfigurations;
  mapping (uint256 => uint256[]) internal delegatesConfigurations;
  mapping (address => TokenData) internal tokens;

  // Scope x ScopeId => AuditStorage
  mapping (address => mapping (uint256 => AuditStorage)) internal audits;

  // Prevents transfer on behalf
  mapping (address => bool) internal selfManaged;

  IUserRegistry internal userRegistry_;
  bytes32 internal currency_;
  string internal name_;

  /**
   * @dev currentTime()
   */
  function currentTime() internal view returns (uint64) {
    // solhint-disable-next-line not-rely-on-time
    return uint64(now);
  }
}
