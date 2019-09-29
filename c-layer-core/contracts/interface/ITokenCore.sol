pragma solidity >=0.5.0 <0.6.0;

import "./IUserRegistry.sol";
import "./IRatesProvider.sol";
import "./IRule.sol";
import "./IClaimable.sol";
import "../TokenStorage.sol";


/**
 * @title ITokenCore
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 **/
contract ITokenCore {

  function name() public view returns (string memory);
  function oracles() public view returns 
    (IUserRegistry, IRatesProvider, bytes32, uint256[] memory);

  function auditSelector(
    address _scope,
    uint256 _scopeId,
    address[] memory _addresses)
    public view returns (bool[] memory);
  function auditShared(
    address _scope,
    uint256 _scopeId) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastReceptionAt,
    uint64 lastEmissionAt,
    uint256 cumulatedReception,
    uint256 cumulatedEmission);
  function auditUser(
    address _scope,
    uint256 _scopeId,
    uint256 _userId) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastReceptionAt,
    uint64 lastEmissionAt,
    uint256 cumulatedReception,
    uint256 cumulatedEmission);
  function auditAddress(
    address _scope,
    uint256 _scopeId,
    address _holder) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastReceptionAt,
    uint64 lastEmissionAt,
    uint256 cumulatedReception,
    uint256 cumulatedEmission);
 
  /***********  TOKEN DATA   ***********/
  function token(address _token) public view returns (
    bool mintingFinished,
    uint256 allTimeIssued,
    uint256 allTimeRedeemed,
    uint256 allTimeSeized,
    uint256[2] memory lock,
    uint256 freezedUntil,
    IRule[] memory,
    IClaimable[] memory);
  function tokenProofs(address _token, address _holder, uint256 _proofId)
    public view returns (uint256, uint64, uint64);
  function canTransfer(address, address, uint256)
    public returns (uint256);

  /***********  TOKEN ADMIN  ***********/
  function issue(address, uint256)
    public returns (bool);
  function redeem(address, uint256)
    public returns (bool);
  function mint(address, address, uint256)
    public returns (bool);
  function finishMinting(address)
    public returns (bool);
  function mintAtOnce(address, address[] memory, uint256[] memory)
    public returns (bool);
  function seize(address _token, address, uint256)
    public returns (bool);
  function freezeManyAddresses(
    address _token,
    address[] memory _addresses,
    uint256 _until) public returns (bool);
  function createProof(address, address)
    public returns (bool);
  function defineLock(address, uint256, uint256, address[] memory)
    public returns (bool);
  function defineRules(address, IRule[] memory) public returns (bool);
  function defineClaimables(address, IClaimable[] memory) public returns (bool);

  /************  CORE ADMIN  ************/
  function defineToken(
    address _token,
    uint256 _delegateId,
    string memory _name,
    string memory _symbol,
    uint256 _decimals) public returns (bool);
  function removeToken(address _token) public returns (bool);
  function defineOracles(
    IUserRegistry _userRegistry,
    IRatesProvider _ratesProvider,
    uint256[] memory _userKeys) public returns (bool);
  function defineAuditSelector(
    address _scope,
    uint256 _scopeId,
    address[] memory _selectorAddresses,
    bool[] memory _selectorValues) public returns (bool);


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
