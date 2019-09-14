pragma solidity >=0.5.0 <0.6.0;

import "./util/math/SafeMath.sol";
import "./operable/OperableStorage.sol";
import "./interface/IRule.sol";
import "./interface/IClaimable.sol";


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

  struct AuditData {
    uint256 createdAt;
    uint256 lastTransactionAt;
    uint256 receivedAmount; // potential overflow
    uint256 sentAmount; // potential overflow
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

    mapping(address => AuditData) audits;
    mapping(address => uint256[3][]) proofs;
    mapping(address => uint256) frozenUntils;

    Lock lock;
    IRule[] rules;
    IClaimable[] claims;
  }
  mapping (address => TokenData) internal tokens_;

  string internal name_;

  /**
   * @dev currentTime()
   */
  function currentTime() internal view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return now;
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
