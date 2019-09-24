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
    FROZEN
  }

  struct AuditDataStorage {
    uint64 createdAt;
    uint64 lastTransactionAt;
    uint64 lastEmissionAt;
    uint64 lastReceptionAt;
    uint256 cumulatedEmission;
    uint256 cumulatedReception;
  }

  struct AuditConfig {
    /*********************
     * Audit Mode bitmap *
     *********************
     * AuditData storage
     * 5 bits - scopeId
     * 1 bit  - 0=token or 1=core scope
     * 2 bits - 0=AuditData.shared, 1=AuditData.byUser, 2=AuditData.byAddress
     *
     * AuditData filters
     * 1 bit  - 0=All or 1=fromSelector
     * 1 bit  - 0=All or 1=toSelector
     *
     * AuditData fields
     * 1 bit  - createdAt
     * 1 bit  - lastTransactionAt
     * 1 bit  - lastEmissionAt
     * 1 bit  - lastReceptionAt
     * 1 bit  - CumulatedEmission
     * 1 bit  - CumulatedReception
     *********************/
    bytes2 auditMode;
    mapping (address => bool) fromSelector;
    mapping (address => bool) toSelector;
  }

  struct AuditData {
    AuditDataStorage shared;
    mapping(uint256 => AuditDataStorage) byUser;
    mapping(address => AuditDataStorage) byAddress;
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

    mapping (address => uint256[3][]) proofs;
    mapping (address => uint256) frozenUntils;
    mapping (uint256 => AuditData) audits;

    Lock lock;
    IRule[] rules;
    IClaimable[] claims;
  }
  mapping (address => TokenData) internal tokens_;

  mapping (address => AuditConfig[]) internal delegateAuditConfigs_;
  mapping (uint256 => AuditData) internal audits;
  IUserRegistry internal userRegistry;
  IRatesProvider internal ratesProvider;

  bytes32 internal currency;
  string internal name_;

  /**
   * @dev currentTime()
   */
  function currentTime() internal view returns (uint64) {
    // solhint-disable-next-line not-rely-on-time
    return uint64(now);
  }

  event Issue(address indexed token, uint256 amount);
  event Redeem(address indexed token, uint256 amount);
  event Mint(address indexed token, uint256 amount);
  event MintFinished(address indexed token);
  event Seize(address indexed token, address account, uint256 amount);
  event ProofCreated(address indexed token, address holder, uint256 proofId);
  event LockDefined(
    address _token,
    uint256 startAt,
    uint256 endAt,
    address[] exceptions
  );
  event Freeze(address _address, uint256 until);
  event RulesDefined(address indexed token, IRule[] rules);
  event ClaimsDefined(address indexed token, IClaimable[] claims);
}
