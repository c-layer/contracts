pragma solidity >=0.5.0 <0.6.0;

import "./operable/OperableCore.sol";
import "./TokenStorage.sol";
import "./interface/ITokenCore.sol";


/**
 * @title TokenCore
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 *   TC01: Token cannot be equivalent to AllProxies
 *   TC02: Currency stored values must remain consistent
 *   TC03: The audit triggers definition requires the same number of addresses and values
 **/
contract TokenCore is ITokenCore, OperableCore, TokenStorage {

  /**
   * @dev constructor
   *
   * @dev It is desired for now that delegates
   * @dev cannot be changed once the core has been deployed.
   */
  constructor(string memory _name) public {
    name_ = _name;
  }

  function name() public view returns (string memory) {
    return name_;
  }

  function oracles() public view returns
    (IUserRegistry, IRatesProvider, bytes32, uint256[] memory)
  {
    return (userRegistry, ratesProvider, currency, userKeys);
  }

  function auditConfiguration(uint256 _configurationId)
    public view returns
  (
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
      bool fieldCumulatedReception
    )
  {
    AuditConfiguration storage auditConfiguration_ = auditConfigurations[_configurationId];
    return (
      auditConfiguration_.mode,
      auditConfiguration_.scopeId,
      auditConfiguration_.scopeCore,
      auditConfiguration_.sharedData,
      auditConfiguration_.userData,
      auditConfiguration_.addressData,
      auditConfiguration_.fieldCreatedAt,
      auditConfiguration_.fieldLastTransactionAt,
      auditConfiguration_.fieldLastEmissionAt,
      auditConfiguration_.fieldLastReceptionAt,
      auditConfiguration_.fieldCumulatedEmission,
      auditConfiguration_.fieldCumulatedReception
    );
  }

  function auditTriggers(
    uint256 _configurationId, address[] memory _triggers)
    public view returns (
      bool[] memory senders,
      bool[] memory receivers,
      bool[] memory tokens
    )
  {
    AuditConfiguration storage auditConfiguration_ = auditConfigurations[_configurationId];
    senders = new bool[](_triggers.length);
    receivers = new bool[](_triggers.length);
    tokens = new bool[](_triggers.length);

    for(uint256 i=0; i < _triggers.length; i++) {
      senders[i] = auditConfiguration_.triggerSenders[_triggers[i]];
      receivers[i] = auditConfiguration_.triggerReceivers[_triggers[i]];
      tokens[i] = auditConfiguration_.triggerTokens[_triggers[i]];
    }
  }

  function delegateConfigurations(uint256 _delegateId)
    public view returns (uint256[] memory) {
    return delegatesConfigurations[_delegateId];
  }

  function auditShared(
    address _scope,
    uint256 _scopeId) public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint64 lastEmissionAt,
    uint64 lastReceptionAt,
    uint256 cumulatedEmission,
    uint256 cumulatedReception)
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
    uint64 lastEmissionAt,
    uint64 lastReceptionAt,
    uint256 cumulatedEmission,
    uint256 cumulatedReception)
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
    uint64 lastEmissionAt,
    uint64 lastReceptionAt,
    uint256 cumulatedEmission,
    uint256 cumulatedReception)
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
    return tokens[msg.sender].name;
  }

  function tokenSymbol() public view returns (string memory) {
    return tokens[msg.sender].symbol;
  }

  function tokenDecimals() public view returns (uint256) {
    return tokens[msg.sender].decimals;
  }

  function tokenTotalSupply() public view returns (uint256) {
    return tokens[msg.sender].totalSupply;
  }

  function tokenBalanceOf(address _owner) public view returns (uint256) {
    return tokens[msg.sender].balances[_owner];
  }

  function tokenAllowance(address _owner, address _spender)
    public view returns (uint256)
  {
    return tokens[msg.sender].allowed[_owner][_spender];
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
    TokenData storage tokenData = tokens[_token];

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
    Proof[] storage proofs = tokens[_token].proofs[_holder];
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
    require(_token != ALL_PROXIES, "TC01");

    defineProxy(_token, _delegateId);
    TokenData storage tokenData = tokens[_token];
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
    delete tokens[_token];

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
      require(_userRegistry.currency() == currency, "TC02");
    } else {
      currency = _userRegistry.currency();
    }
    userRegistry = _userRegistry;
    ratesProvider = _ratesProvider;
    userKeys = _userKeys;

    emit OraclesDefined(userRegistry, ratesProvider, currency, userKeys);
    return true;
  }

  function defineTokenDelegate(
    uint256 _delegateId,
    address _delegate,
    uint256[] memory _configurations) public onlyCoreOp returns (bool)
  {
    defineDelegate(_delegateId, _delegate);
    if(_delegate != address(0)) {
      delegatesConfigurations[_delegateId] = _configurations;
      emit TokenDelegateDefined(_delegateId, _delegate, _configurations);
    } else {
      delete delegatesConfigurations[_delegateId];
      emit TokenDelegateRemoved(_delegateId);
    }
    return true;
  }

  function defineAuditConfiguration(
    uint256 _configurationId,
    AuditMode _mode,
    uint256 _scopeId,
    bool _scopeCore,
    bool[3] memory _data,
    bool[6] memory _fields) public onlyCoreOp returns (bool)
  {
    AuditConfiguration storage auditConfiguration_ = auditConfigurations[_configurationId];
    auditConfiguration_.mode = _mode;
    auditConfiguration_.scopeId = _scopeId;
    auditConfiguration_.scopeCore = _scopeCore;
    auditConfiguration_.sharedData = _data[0];
    auditConfiguration_.userData = _data[1];
    auditConfiguration_.addressData = _data[2];
    auditConfiguration_.fieldCreatedAt = _fields[0];
    auditConfiguration_.fieldLastTransactionAt = _fields[1];
    auditConfiguration_.fieldLastEmissionAt = _fields[2];
    auditConfiguration_.fieldLastReceptionAt = _fields[3];
    auditConfiguration_.fieldCumulatedEmission = _fields[4];
    auditConfiguration_.fieldCumulatedReception = _fields[5];

    emit AuditConfigurationDefined(_configurationId, _scopeId, _scopeCore, _mode);
    return true;
  }

  function defineAuditTriggers(
    uint256 _configurationId,
    address[] memory _triggerAddresses,
    bool[] memory _triggerSenders,
    bool[] memory _triggerReceivers,
    bool[] memory _triggerTokens) public onlyCoreOp returns (bool)
  {
    require(_triggerAddresses.length == _triggerSenders.length
      && _triggerAddresses.length == _triggerReceivers.length
      && _triggerAddresses.length == _triggerTokens.length, "TC03");

    AuditConfiguration storage auditConfiguration_ = auditConfigurations[_configurationId];
    for(uint256 i=0; i < _triggerAddresses.length; i++) {
      auditConfiguration_.triggerSenders[_triggerAddresses[i]] = _triggerSenders[i];
      auditConfiguration_.triggerReceivers[_triggerAddresses[i]] = _triggerReceivers[i];
      auditConfiguration_.triggerTokens[_triggerAddresses[i]] = _triggerTokens[i];
    }

    emit AuditTriggersDefined(_configurationId, _triggerAddresses, _triggerSenders, _triggerReceivers, _triggerTokens);
    return true;
  }

  function isSelfManaged(address _owner)
    public view returns (bool)
  {
    return selfManaged[_owner];
  }

  function manageSelf(bool _active)
    public returns (bool)
  {
    selfManaged[msg.sender] = _active;
    emit SelfManaged(msg.sender, _active);
  }
}
