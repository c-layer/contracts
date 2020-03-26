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
  function oracles() public view returns
    (IUserRegistry, IRatesProvider, bytes32, uint256[] memory);

  function auditConfiguration(uint256 _configurationId)
    public view returns (
      AuditMode mode,
      uint256 scopeId,
      bool scopeCore,
      bool sharedData,
      bool userData,
      bool addressData,
      bool fieldCreatedAt,
      bool fieldLastTransactionAt,
      bool fieldLastEmissionAt,
      bool fieldLastReceptionAt,
      bool fieldCumulatedEmission,
      bool fieldCumulatedReception);
  function auditTriggers(
    uint256 _configurationId,
    address[] memory _triggers) public view returns (
    bool[] memory senders,
    bool[] memory receivers,
    bool[] memory tokens);
  function delegateConfigurations(uint256 _delegateId)
    public view returns (uint256[] memory);

  function auditShared(
    address _scope,
    uint256 _scopeId) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastEmissionAt,
    uint64 lastReceptionAt,
    uint256 cumulatedEmission,
    uint256 cumulatedReception);
  function auditUser(
    address _scope,
    uint256 _scopeId,
    uint256 _userId) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastEmissionAt,
    uint64 lastReceptionAt,
    uint256 cumulatedEmission,
    uint256 cumulatedReception);
  function auditAddress(
    address _scope,
    uint256 _scopeId,
    address _holder) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastEmissionAt,
    uint64 lastReceptionAt,
    uint256 cumulatedEmission,
    uint256 cumulatedReception);

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
  function defineTokenDelegate(
    uint256 _delegateId,
    address _delegate,
    uint256[] memory _configurations) public returns (bool);
  function defineAuditConfiguration(
    uint256 _configurationId,
    AuditMode _mode,
    uint256 _scopeId,
    bool _scopeCore,
    bool[3] memory _data,
    bool[6] memory _fields) public returns (bool);
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
