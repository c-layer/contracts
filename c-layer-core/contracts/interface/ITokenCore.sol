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
  function oracles() public view returns (IUserRegistry, IRatesProvider, bytes32);

  function auditModes() public view returns (bytes2[] memory auditModes_);
  function auditSelector(
    address _delegate,
    uint256 _configId,
    address[] memory _addresses)
    public view returns (bool[] memory, bool[] memory);
  function auditShared(uint256 _scopeId) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastReceptionAt,
    uint64 lastEmissionAt,
    uint256 cumulatedReception,
    uint256 cumulatedEmission);
  function auditByUser(uint256 _scopeId, uint256 _userId) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastReceptionAt,
    uint64 lastEmissionAt,
    uint256 cumulatedReception,
    uint256 cumulatedEmission);
  function auditByAddress(uint256 _scopeId, address _holder) public view returns (
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
  function tokenAuditShared(address _token, uint256 _scopeId) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastReceptionAt,
    uint64 lastEmissionAt,
    uint256 cumulatedReception,
    uint256 cumulatedEmission);
  function tokenAuditByUser(address _token, uint256 _scopeId, uint256 _userId) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastReceptionAt,
    uint64 lastEmissionAt,
    uint256 cumulatedReception,
    uint256 cumulatedEmission);
  function tokenAuditByAddress(address _token, uint256 _scopeId, address _holder) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastReceptionAt,
    uint64 lastEmissionAt,
    uint256 cumulatedReception,
    uint256 cumulatedEmission);
  function tokenProofs(address _token, address _holder, uint256 _proofId)
    public view returns (uint256[3] memory);
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
  function freeze(address _token, address _address, uint256 _until)
    public returns (bool);
  function freezeManyAddresses(
    address _token,
    address[] memory _addresses,
    uint256 _until) public returns (bool);
  function createProof(address, address, uint256, uint256)
    public returns (bool);
  function defineLock(address, uint256, uint256, address[] memory)
    public returns (bool);
  function defineRules(address, IRule[] memory) public returns (bool);
  function defineClaims(address, IClaimable[] memory) public returns (bool);

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
    IRatesProvider _ratesProvider) public returns (bool);
  function defineAuditSelector(
    address _delegate,
    uint256 _configId,
    address[] memory _selectorAddresses,
    bool[] memory _fromSelectorValues,
    bool[] memory _toSelectorValues) public returns (bool);

  event OraclesDefined(IUserRegistry userRegistry, IRatesProvider ratesProvider, bytes32 currency);
  event Issue(address indexed token, uint256 amount);
  event Redeem(address indexed token, uint256 amount);
  event Mint(address indexed token, uint256 amount);
  event MintFinished(address indexed token);
  event ProofCreated(address indexed token, address holder, uint256 proofId);
  event RulesDefined(address indexed token, address[] rules);
  event LockDefinition(
    address _token,
    uint256 startAt,
    uint256 endAt,
    address[] exceptions
  );
  event ClaimsDefined(address indexed token, address[] claims);
}
