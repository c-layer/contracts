pragma solidity >=0.5.0 <0.6.0;

import "./util/math/SafeMath.sol";
import "./operable/OperableStorage.sol";
import "./interface/IRule.sol";
import "./interface/IClaimable.sol";
import "./interface/IUserRegistry.sol";
import "./interface/IRatesProvider.sol";


/**
 * @title Token storage
 * @dev Token storage
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract TokenStorage is OperableStorage {
  using SafeMath for uint256;

  enum TransferCode {
    UNKNOWN,
    OK,
    NO_RECIPIENT,
    INSUFFICIENT_TOKENS,
    LOCKED,
    FROZEN,
    RULE,
    LIMITED
  }

  struct Proof {
    uint256 amount;
    uint64 startAt;
    uint64 endAt;
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
    mapping (address => bool) selector;

    AuditData sharedData;
    mapping(uint256 => AuditData) userData;
    mapping(address => AuditData) addressData;
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
    mapping (uint256 => AuditStorage) audits;

    Lock lock;
    IRule[] rules;
    IClaimable[] claimables;
  }
  mapping (address => TokenData) internal tokens_;
  mapping (address => mapping (uint256 => AuditStorage)) internal audits;

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

  event OraclesDefined(
    IUserRegistry userRegistry,
    IRatesProvider ratesProvider,
    bytes32 currency,
    uint256[] userKeys);
  event AuditSelectorDefined(
    address indexed scope, uint256 scopeId, address[] addresses, bool[] values);
  event Issue(address indexed token, uint256 amount);
  event Redeem(address indexed token, uint256 amount);
  event Mint(address indexed token, uint256 amount);
  event MintFinished(address indexed token);
  event ProofCreated(address indexed token, address holder, uint256 proofId);
  event RulesDefined(address indexed token, IRule[] rules);
  event LockDefined(
    address indexed token,
    uint256 startAt,
    uint256 endAt,
    address[] exceptions
  );
  event Seize(address indexed token, address account, uint256 amount);
  event Freeze(address address_, uint256 until);
  event ClaimablesDefined(address indexed token, IClaimable[] claimables);
  event TokenDefined(
    address indexed token,
    uint256 delegateId,
    string name,
    string symbol,
    uint256 decimals);
  event TokenRemoved(address indexed token);
}
