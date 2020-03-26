pragma solidity >=0.5.0 <0.6.0;

import "./util/math/SafeMath.sol";
import "./operable/OperableStorage.sol";
import "./interface/IRule.sol";
import "./interface/IClaimable.sol";
import "./interface/IUserRegistry.sol";
import "./interface/IRatesProvider.sol";
import "./interface/ITokenStorage.sol";


/**
 * @title Token storage
 * @dev Token storage
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
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
    mapping (address => mapping (address => uint256)) allowed;

    bool mintingFinished;

    uint256 allTimeIssued; // potential overflow
    uint256 allTimeRedeemed; // potential overflow
    uint256 allTimeSeized; // potential overflow

    mapping (address => Proof[]) proofs;
    mapping (address => uint256) frozenUntils;

    Lock lock;
    IRule[] rules;
    IClaimable[] claimables;
  }

  struct AuditData {
    uint64 createdAt;
    uint64 lastTransactionAt;
    uint64 lastEmissionAt;
    uint64 lastReceptionAt;
    uint256 cumulatedEmission;
    uint256 cumulatedReception;
  }

  struct AuditStorage {
    AuditData sharedData;
    mapping(uint256 => AuditData) userData;
    mapping(address => AuditData) addressData;
  }

  // DelegateId => AuditConfiguration[]
  mapping (uint256 => AuditConfiguration) auditConfigurations;
  mapping (uint256 => uint256[]) internal delegatesConfigurations;
  mapping (address => TokenData) internal tokens;

  // Scope x ScopeId => AuditStorage
  mapping (address => mapping (uint256 => AuditStorage)) internal audits;

  // Prevents transfer on behalf
  mapping (address => bool) selfManaged;

  IUserRegistry internal userRegistry;
  IRatesProvider internal ratesProvider;

  bytes32 internal currency;
  uint256[] internal userKeys;

  string internal name_;

  /**
   * @dev currentTime()
   */
  function currentTime() internal view returns (uint64) {
    // solhint-disable-next-line not-rely-on-time
    return uint64(now);
  }
}
