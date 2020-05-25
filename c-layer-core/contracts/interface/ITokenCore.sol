pragma solidity >=0.5.0 <0.6.0;

import "./ITokenStorage.sol";
import "./IOperableCore.sol";


/**
 * @title ITokenCore
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 **/
contract ITokenCore is ITokenStorage, IOperableCore {

  function name() public view returns (string memory);
  function oracle() public view returns (
    IUserRegistry userRegistry,
    bytes32 currency);

  function auditConfiguration(uint256 _configurationId)
    public view returns (
      uint256 scopeId,
      bool scopeCore,
      AuditMode mode,
      AuditStorageMode storageMode,
      uint256[] memory userKeys,
      IRatesProvider ratesProvider,
      bytes32 currency,
      bool[6] memory fields);
  function auditTriggers(
    uint256 _configurationId,
    address[] memory _triggers) public view returns (
    bool[] memory senders,
    bool[] memory receivers,
    bool[] memory tokens);
  function delegateConfigurations(uint256 _delegateId)
    public view returns (uint256[] memory);

  function auditCurrency(
    address _scope,
    uint256 _scopeId
  ) public view returns (bytes32 currency);
  function audit(
    address _scope,
    uint256 _scopeId,
    AuditStorageMode _storageMode,
    bytes32 _storageId) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastEmissionAt,
    uint64 lastReceptionAt,
    uint256 cumulatedEmission,
    uint256 cumulatedReception);

  /**************  ERC20  **************/
  function tokenName() public view returns (string memory);
  function tokenSymbol() public view returns (string memory);

  function decimals() public returns (uint256);
  function totalSupply() public returns (uint256);
  function balanceOf(address) public returns (uint256);
  function allowance(address, address) public returns (uint256);
  function transfer(address, address, uint256)
    public returns (bool status);
  function transferFrom(address, address, address, uint256)
    public returns (bool status);
  function approve(address, address, uint256)
    public returns (bool status);
  function increaseApproval(address, address, uint256)
    public returns (bool status);
  function decreaseApproval(address, address, uint256)
    public returns (bool status);

  /***********  TOKEN DATA   ***********/
  function token(address _token) public view returns (
    bool mintingFinished,
    uint256 allTimeMinted,
    uint256 allTimeBurned,
    uint256 allTimeSeized,
    uint256[2] memory lock,
    uint256 freezedUntil,
    IRule[] memory,
    uint256 latestClaimAt);
  function tokenProofs(address _token, address _holder, uint256 _proofId)
    public view returns (uint256, uint64, uint64);
  function canTransfer(address, address, uint256)
    public returns (uint256);

  /***********  TOKEN ADMIN  ***********/
  function mint(address, address[] memory, uint256[] memory)
    public returns (bool);
  function finishMinting(address)
    public returns (bool);
  function burn(address, uint256)
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
  function defineClaim(address, address, uint256) public returns (bool);

  /************  CORE ADMIN  ************/
  function defineToken(
    address _token,
    uint256 _delegateId,
    string memory _name,
    string memory _symbol,
    uint256 _decimals) public returns (bool);
  function removeToken(address _token) public returns (bool);

  function defineOracle(
    IUserRegistry _userRegistry) public returns (bool);
  function defineTokenDelegate(
    uint256 _delegateId,
    address _delegate,
    uint256[] memory _configurations) public returns (bool);
  function defineAuditConfiguration(
    uint256 _configurationId,
    uint256 _scopeId,
    bool _scopeCore,
    AuditMode _mode,
    AuditStorageMode _storageMode,
    uint256[] memory userKeys,
    IRatesProvider _ratesProvider,
    bytes32 _currency,
    bool[6] memory _fields) public returns (bool);
  function removeAudits(address _scope, uint256 _scopeId)
    public returns (bool);
  function defineAuditTriggers(
    uint256 _configurationId,
    address[] memory _triggerAddresses,
    bool[] memory _triggerSenders,
    bool[] memory _triggerReceivers,
    bool[] memory _triggerTokens) public returns (bool);

  function isSelfManaged(address _owner)
    public view returns (bool);
  function manageSelf(bool _active)
    public returns (bool);
}
