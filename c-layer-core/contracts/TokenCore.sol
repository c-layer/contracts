pragma solidity >=0.5.0 <0.6.0;

import "./operable/OperableCore.sol";
import "./TokenStorage.sol";
import "./TokenProxy.sol";
import "./interface/ITokenCore.sol";


/**
 * @title TokenCore
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 *   TC01: Currency stored values must remain consistent
 **/
contract TokenCore is ITokenCore, OperableCore, TokenStorage {

  /**
   * @dev constructor
   *
   * @dev It is desired for now that delegates
   * @dev cannot be changed once the core has been deployed.
   */
  constructor(string memory _name, address[] memory _delegates) public {
    name_ = _name;
    delegates = _delegates;
  }

  function name() public view returns (string memory) {
    return name_;
  }

  function oracles() public view returns
    (IUserRegistry, IRatesProvider, bytes32, uint256[] memory)
  {
    return (userRegistry, ratesProvider, currency, userKeys);
  }

  function auditSelector(
    address _scope,
    uint256 _scopeId,
    address[] memory _addresses)
    public view returns (bool[] memory)
  {
    AuditStorage storage auditStorage = audits[_scope][_scopeId];
    bool[] memory selector = new bool[](_addresses.length);
    for (uint256 i=0; i < _addresses.length; i++) {
      selector[i] = auditStorage.selector[_addresses[i]];
    }
    return selector;
  }

  function auditShared(
    address _scope,
    uint256 _scopeId) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastReceptionAt,
    uint64 lastEmissionAt,
    uint256 cumulatedReception,
    uint256 cumulatedEmission)
  {
    AuditData memory audit = audits[_scope][_scopeId].sharedData;
    createdAt = audit.createdAt;
    lastTransactionAt = audit.lastTransactionAt;
    lastReceptionAt = audit.lastReceptionAt;
    lastEmissionAt = audit.lastEmissionAt;
    cumulatedReception = audit.cumulatedReception;
    cumulatedEmission = audit.cumulatedEmission;
  }

  function auditUser(
    address _scope,
    uint256 _scopeId,
    uint256 _userId) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastReceptionAt,
    uint64 lastEmissionAt,
    uint256 cumulatedReception,
    uint256 cumulatedEmission)
  {
    AuditData memory audit = audits[_scope][_scopeId].userData[_userId];
    createdAt = audit.createdAt;
    lastTransactionAt = audit.lastTransactionAt;
    lastReceptionAt = audit.lastReceptionAt;
    lastEmissionAt = audit.lastEmissionAt;
    cumulatedReception = audit.cumulatedReception;
    cumulatedEmission = audit.cumulatedEmission;
  }

  function auditAddress(
    address _scope,
    uint256 _scopeId,
    address _holder) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastReceptionAt,
    uint64 lastEmissionAt,
    uint256 cumulatedReception,
    uint256 cumulatedEmission)
  {
    AuditData memory audit = audits[_scope][_scopeId].addressData[_holder];
    createdAt = audit.createdAt;
    lastTransactionAt = audit.lastTransactionAt;
    lastReceptionAt = audit.lastReceptionAt;
    lastEmissionAt = audit.lastEmissionAt;
    cumulatedReception = audit.cumulatedReception;
    cumulatedEmission = audit.cumulatedEmission;
  }

  /**************  ERC20  **************/
  function tokenName() public view returns (string memory) {
    return tokens_[msg.sender].name;
  }

  function tokenSymbol() public view returns (string memory) {
    return tokens_[msg.sender].symbol;
  }

  function tokenDecimals() public view returns (uint256) {
    return tokens_[msg.sender].decimals;
  }

  function tokenTotalSupply() public view returns (uint256) {
    return tokens_[msg.sender].totalSupply;
  }

  function tokenBalanceOf(address _owner) public view returns (uint256) {
    return tokens_[msg.sender].balances[_owner];
  }

  function tokenAllowance(address _owner, address _spender)
    public view returns (uint256)
  {
    return tokens_[msg.sender].allowed[_owner][_spender];
  }

  function transfer(address, address, uint256)
    public onlyProxy returns (bool status)
  {
    return delegateCall(msg.sender);
  }

  function transferFrom(address, address, address, uint256)
    public onlyProxy returns (bool status)
  {
    return delegateCall(msg.sender);
  }

  function approve(address, address, uint256)
    public onlyProxy returns (bool status)
  {
    return delegateCall(msg.sender);
  }

  function increaseApproval(address, address, uint256)
    public onlyProxy returns (bool status)
  {
    return delegateCall(msg.sender);
  }

  function decreaseApproval(address, address, uint256)
    public onlyProxy returns (bool status)
  {
    return delegateCall(msg.sender);
  }

  function canTransfer(address, address, uint256)
    public onlyProxy returns (uint256)
  {
    return delegateCallUint256(msg.sender);
  }

  /***********  TOKEN DATA   ***********/
  function token(address _token) public view returns (
    bool mintingFinished,
    uint256 allTimeIssued,
    uint256 allTimeRedeemed,
    uint256 allTimeSeized,
    uint256[2] memory lock,
    uint256 frozenUntil,
    IRule[] memory rules,
    IClaimable[] memory claimables) {
    TokenData storage tokenData = tokens_[_token];

    mintingFinished = tokenData.mintingFinished;
    allTimeIssued = tokenData.allTimeIssued;
    allTimeRedeemed = tokenData.allTimeRedeemed;
    allTimeSeized = tokenData.allTimeSeized;
    lock = [ tokenData.lock.startAt, tokenData.lock.endAt ];
    frozenUntil = tokenData.frozenUntils[msg.sender];
    rules = tokenData.rules;
    claimables = tokenData.claimables;
  }

  function tokenProofs(address _token, address _holder, uint256 _proofId)
    public view returns (uint256, uint64, uint64)
  {
    Proof[] storage proofs = tokens_[_token].proofs[_holder];
    if (_proofId < proofs.length) {
      Proof storage proof = proofs[_proofId];
      return (proof.amount, proof.startAt, proof.endAt);
    }
    return (uint256(0), uint64(0), uint64(0));
  }

  /***********  TOKEN ADMIN  ***********/
  function issue(address _token, uint256)
    public onlyProxyOp(_token) returns (bool)
  {
    return delegateCall(_token);
  }

  function redeem(address _token, uint256)
    public onlyProxyOp(_token) returns (bool)
  {
    return delegateCall(_token);
  }

  function mint(address _token, address, uint256)
    public onlyProxyOp(_token) returns (bool)
  {
    return delegateCall(_token);
  }

  function finishMinting(address _token)
    public onlyProxyOp(_token) returns (bool)
  {
    return delegateCall(_token);
  }

  function mintAtOnce(address _token, address[] memory, uint256[] memory)
    public onlyProxyOp(_token) returns (bool)
  {
    return delegateCall(_token);
  }

  function seize(address _token, address, uint256)
    public onlyProxyOp(_token) returns (bool)
  {
    return delegateCall(_token);
  }

  function freezeManyAddresses(
    address _token,
    address[] memory,
    uint256) public onlyProxyOp(_token) returns (bool)
  {
    return delegateCall(_token);
  }

  function createProof(address _token, address)
    public returns (bool)
  {
    return delegateCall(_token);
  }

  function defineLock(address _token, uint256, uint256, address[] memory)
    public onlyProxyOp(_token) returns (bool)
  {
    return delegateCall(_token);
  }

  function defineRules(address _token, IRule[] memory)
    public onlyProxyOp(_token) returns (bool)
  {
    return delegateCall(_token);
  }

  function defineClaimables(address _token, IClaimable[] memory)
    public onlyProxyOp(_token) returns (bool)
  {
    return delegateCall(_token);
  }

  /************  CORE ADMIN  ************/
  function defineToken(
    address _token,
    uint256 _delegateId,
    string memory _name,
    string memory _symbol,
    uint256 _decimals)
    public onlyCoreOp returns (bool)
  {
    defineProxy(_token, _delegateId);
    TokenData storage tokenData = tokens_[_token];
    tokenData.name = _name;
    tokenData.symbol = _symbol;
    tokenData.decimals = _decimals;

    emit TokenDefined(_token, _delegateId, _name, _symbol, _decimals);
    return true;
  }

  function removeToken(address _token)
    public onlyCoreOp returns (bool)
  {
    removeProxy(_token);
    delete tokens_[_token];

    emit TokenRemoved(_token);
    return true;
  }

  function defineOracles(
    IUserRegistry _userRegistry,
    IRatesProvider _ratesProvider,
    uint256[] memory _userKeys)
    public onlyCoreOp returns (bool)
  {
    if (currency != bytes32(0)) {
      // Updating the core currency is not yet supported
      require(_userRegistry.currency() == currency, "TC01");
    } else {
      currency = _userRegistry.currency();
    }
    userRegistry = _userRegistry;
    ratesProvider = _ratesProvider;
    userKeys = _userKeys;

    emit OraclesDefined(userRegistry, ratesProvider, currency, userKeys);
  }

  function defineAuditSelector(
    address _scope,
    uint256 _scopeId,
    address[] memory _selectorAddresses,
    bool[] memory _selectorValues) public onlyCoreOp returns (bool)
  {
    AuditStorage storage auditStorage = audits[_scope][_scopeId];
    for (uint256 i=0; i < _selectorAddresses.length; i++) {
      auditStorage.selector[_selectorAddresses[i]] = _selectorValues[i];
    }

    emit AuditSelectorDefined(_scope, _scopeId, _selectorAddresses, _selectorValues);
    return true;
  }
}
