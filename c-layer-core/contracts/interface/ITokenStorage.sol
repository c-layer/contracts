pragma solidity >=0.5.0 <0.6.0;

import "./IUserRegistry.sol";
import "./IRatesProvider.sol";
import "./IRule.sol";
import "./IClaimable.sol";


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
    LIMITED_RECEPTION
  }

  enum AuditMode {
    NEVER,
    TRIGGERS_ONLY,
    TRIGGERS_EXCLUDED,
    ALWAYS
  }

  struct AuditConfiguration {
    AuditMode mode;
    mapping (address => bool) triggerSenders;
    mapping (address => bool) triggerReceivers;
    mapping (address => bool) triggerTokens;

    uint256 scopeId;
    bool scopeCore;
    bool sharedData;
    bool userData;
    bool addressData;
    bool fieldCreatedAt;
    bool fieldLastTransactionAt;
    bool fieldLastEmissionAt;
    bool fieldLastReceptionAt;
    bool fieldCumulatedEmission;
    bool fieldCumulatedReception;
  }

  event OraclesDefined(
    IUserRegistry userRegistry,
    IRatesProvider ratesProvider,
    bytes32 currency,
    uint256[] userKeys);
  event TokenDelegateDefined(uint256 indexed delegateId, address delegate, uint256[] configurations);
  event TokenDelegateRemoved(uint256 indexed delegateId);
  event AuditConfigurationDefined(uint256 indexed configurationId, uint256 scopeId, bool scopeCore, AuditMode mode);
  event AuditTriggersDefined(uint256 indexed configurationId, address[] triggers, bool[] senders, bool[] receivers, bool[] tokens);
  event SelfManaged(address indexed holder, bool active);

  event Issue(address indexed token, uint256 amount);
  event Redeem(address indexed token, uint256 amount);
  event Mint(address indexed token, uint256 amount);
  event MintFinished(address indexed token);
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
  event ClaimablesDefined(address indexed token, IClaimable[] claimables);
  event TokenDefined(
    address indexed token,
    uint256 delegateId,
    string name,
    string symbol,
    uint256 decimals);
  event TokenRemoved(address indexed token);
}
