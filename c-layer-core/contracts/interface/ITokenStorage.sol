pragma solidity >=0.5.0 <0.6.0;

import "./IUserRegistry.sol";
import "./IRatesProvider.sol";
import "./IRule.sol";


/**
 * @title IToken storage
 * @dev IToken storage
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract ITokenStorage {
  enum TransferCode {
    UNKNOWN,
    OK,
    INVALID_SENDER,
    NO_RECIPIENT,
    INSUFFICIENT_TOKENS,
    LOCKED,
    FROZEN,
    RULE,
    LIMITED_EMISSION,
    LIMITED_RECEPTION,
    INVALID_CURRENCY_CONFIGURATION
  }

  enum SCOPE {
    DEFAULT
  }

  enum AUDIT_CONFIGURATION {
    PROOF_OF_OWNERSHIP,
    LIMITABLE_TRANSFERABILITY
  }

  enum AuditStorageMode {
    ADDRESS,
    USER_ID,
    SHARED
  }

  enum AuditMode {
    NEVER,
    TRIGGERS_ONLY,
    TRIGGERS_EXCLUDED,
    ALWAYS
  }

  event OracleDefined(
    IUserRegistry userRegistry,
    bytes32 currency);
  event TokenDelegateDefined(uint256 indexed delegateId, address delegate, uint256[] configurations);
  event TokenDelegateRemoved(uint256 indexed delegateId);
  event AuditConfigurationDefined(
    uint256 indexed configurationId,
    uint256 scopeId,
    bool scopeCore,
    AuditMode mode,
    AuditStorageMode storageMode,
    uint256[] userKeys,
    IRatesProvider ratesProvider,
    bytes32 currency);
  event AuditTriggersDefined(uint256 indexed configurationId, address[] triggers, bool[] senders, bool[] receivers, bool[] tokens);
  event SelfManaged(address indexed holder, bool active);

  event Minted(address indexed token, uint256 amount);
  event MintFinished(address indexed token);
  event Burned(address indexed token, uint256 amount);
  event ProofCreated(address indexed token, address indexed holder, uint256 proofId);
  event RulesDefined(address indexed token, IRule[] rules);
  event LockDefined(
    address indexed token,
    uint256 startAt,
    uint256 endAt,
    address[] exceptions
  );
  event Seize(address indexed token, address account, uint256 amount);
  event Freeze(address address_, uint256 until);
  event ClaimDefined(
    address indexed token,
    address indexed claim,
    uint256 claimAt);
  event TokenDefined(
    address indexed token,
    uint256 delegateId,
    string name,
    string symbol,
    uint256 decimals);
  event TokenMigrated(address indexed token, address newCore);
  event TokenRemoved(address indexed token);
  event TransferAuditLog(
    uint256 senderId,
    uint256 receiverId,
    uint256 cumulatedEmission,
    uint256 senderLimit,
    uint256 cumulatedReception,
    uint256 receiverLimit);
}
