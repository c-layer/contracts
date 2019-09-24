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
 **/
contract TokenCore is ITokenCore, OperableCore, TokenStorage {

  /**
   * @dev constructor
   *
   * @dev It is desired for now:
   * @dev - that delegates and auditModes cannot be changed once the core has been deployed.
   * @dev - that auditModes is limited to one per delegates.
   */
  constructor(string memory _name, address[] memory _delegates, bytes2[] memory _auditModes) public {
    name_ = _name;
    delegates = _delegates;
    for (uint256 i=0; i < delegates.length; i++) {
      delegateAuditConfigs_[delegates[i]].push(
        AuditConfig(_auditModes[i]));
    }
  }

  function name() public view returns (string memory) {
    return name_;
  }

  function oracles() public view returns (IUserRegistry, IRatesProvider, bytes32) {
    return (userRegistry, ratesProvider, currency);
  }

  function auditModes() public view returns (bytes2[] memory auditModes_) {
    auditModes_ = new bytes2[](delegates.length);
    for (uint256 i=0; i < delegates.length; i++) {
      auditModes_[i] = delegateAuditConfigs_[delegates[i]][0].auditMode;
    }
  }

  function auditSelector(
    address _delegate,
    uint256 _configId,
    address[] memory _addresses)
    public view returns (bool[] memory, bool[] memory)
  {
    AuditConfig storage auditConfig = delegateAuditConfigs_[_delegate][_configId];
    bool[] memory fromSelector = new bool[](_addresses.length);
    bool[] memory toSelector = new bool[](_addresses.length);
    for (uint256 i=0; i < _addresses.length; i++) {
      fromSelector[i] = auditConfig.fromSelector[_addresses[i]];
      toSelector[i] = auditConfig.toSelector[_addresses[i]];
    }
    return (fromSelector, toSelector);
  }

  function auditShared(uint256 _scopeId) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastReceptionAt,
    uint64 lastEmissionAt,
    uint256 cumulatedReception,
    uint256 cumulatedEmission)
  {
    AuditDataStorage memory audit = audits[_scopeId].shared;
    createdAt = audit.createdAt;
    lastTransactionAt = audit.lastTransactionAt;
    lastReceptionAt = audit.lastReceptionAt;
    lastEmissionAt = audit.lastEmissionAt;
    cumulatedReception = audit.cumulatedReception;
    cumulatedEmission = audit.cumulatedEmission;
  }

  function auditByUser(uint256 _scopeId, uint256 _userId) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastReceptionAt,
    uint64 lastEmissionAt,
    uint256 cumulatedReception,
    uint256 cumulatedEmission)
  {
    AuditDataStorage memory audit = audits[_scopeId].byUser[_userId];
    createdAt = audit.createdAt;
    lastTransactionAt = audit.lastTransactionAt;
    lastReceptionAt = audit.lastReceptionAt;
    lastEmissionAt = audit.lastEmissionAt;
    cumulatedReception = audit.cumulatedReception;
    cumulatedEmission = audit.cumulatedEmission;
  }

  function auditByAddress(uint256 _scopeId, address _holder) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastReceptionAt,
    uint64 lastEmissionAt,
    uint256 cumulatedReception,
    uint256 cumulatedEmission)
  {
    AuditDataStorage memory audit = audits[_scopeId].byAddress[_holder];
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
    IClaimable[] memory claims) {
    TokenData storage tokenData = tokens_[_token];

    mintingFinished = tokenData.mintingFinished;
    allTimeIssued = tokenData.allTimeIssued;
    allTimeRedeemed = tokenData.allTimeRedeemed;
    allTimeSeized = tokenData.allTimeSeized;
    lock = [ tokenData.lock.startAt, tokenData.lock.endAt ];
    frozenUntil = tokenData.frozenUntils[msg.sender];
    rules = tokenData.rules;
    claims = tokenData.claims;
  }

  function tokenAuditShared(address _token, uint256 _scopeId) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastReceptionAt,
    uint64 lastEmissionAt,
    uint256 cumulatedReception,
    uint256 cumulatedEmission)
  {
    AuditDataStorage memory audit = tokens_[_token].audits[_scopeId].shared;
    createdAt = audit.createdAt;
    lastTransactionAt = audit.lastTransactionAt;
    lastReceptionAt = audit.lastReceptionAt;
    lastEmissionAt = audit.lastEmissionAt;
    cumulatedReception = audit.cumulatedReception;
    cumulatedEmission = audit.cumulatedEmission;
  }

  function tokenAuditByUser(address _token, uint256 _scopeId, uint256 _userId) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastReceptionAt,
    uint64 lastEmissionAt,
    uint256 cumulatedReception,
    uint256 cumulatedEmission)
  {
    AuditDataStorage memory audit = tokens_[_token].audits[_scopeId].byUser[_userId];
    createdAt = audit.createdAt;
    lastTransactionAt = audit.lastTransactionAt;
    lastReceptionAt = audit.lastReceptionAt;
    lastEmissionAt = audit.lastEmissionAt;
    cumulatedReception = audit.cumulatedReception;
    cumulatedEmission = audit.cumulatedEmission;
  }

  function tokenAuditByAddress(address _token, uint256 _scopeId, address _holder) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastReceptionAt,
    uint64 lastEmissionAt,
    uint256 cumulatedReception,
    uint256 cumulatedEmission)
  {
    AuditDataStorage memory audit = tokens_[_token].audits[_scopeId].byAddress[_holder];
    createdAt = audit.createdAt;
    lastTransactionAt = audit.lastTransactionAt;
    lastReceptionAt = audit.lastReceptionAt;
    lastEmissionAt = audit.lastEmissionAt;
    cumulatedReception = audit.cumulatedReception;
    cumulatedEmission = audit.cumulatedEmission;
  }

  function tokenProofs(address _token, address _holder, uint256 _proofId)
    public view returns (uint256[3] memory)
  {
    return tokens_[_token].proofs[_holder][_proofId];
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

  function freeze(address _token, address, uint256)
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

  function createProof(address _token, address, uint256, uint256)
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

  function defineClaims(address _token, IClaimable[] memory)
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
    return true;
  }

  function removeToken(address _token)
    public onlyCoreOp returns (bool)
  {
    removeProxy(_token);
    delete tokens_[_token];
    return true;
  }

  function defineOracles(IUserRegistry _userRegistry, IRatesProvider _ratesProvider)
    public onlyCoreOp returns (bool)
  {
    if (currency != bytes32(0)) {
      // Updating the core currency is not yet supported
      require(_userRegistry.currency() == currency);
    } else {
      currency = _userRegistry.currency();
    }
    userRegistry = _userRegistry;
    ratesProvider = _ratesProvider;
    
    emit OraclesDefined(userRegistry, ratesProvider, currency);
  }

  function defineAuditSelector(
    address _delegate,
    uint256 _configId,
    address[] memory _selectorAddresses,
    bool[] memory _fromSelectorValues,
    bool[] memory _toSelectorValues) public onlyCoreOp returns (bool)
  {
    AuditConfig storage auditConfig = delegateAuditConfigs_[_delegate][_configId];
    for(uint256 i=0; i < _selectorAddresses.length; i++) {
      auditConfig.fromSelector[_selectorAddresses[i]] = _fromSelectorValues[i];
    }

    for(uint256 i=0; i < _selectorAddresses.length; i++) {
      auditConfig.toSelector[_selectorAddresses[i]] = _toSelectorValues[i];
    }

    return true;
  }
}
