pragma solidity ^0.6.0;

import "@c-layer/common/contracts/core/OperableCore.sol";
import "./TokenStorage.sol";
import "./interface/ITokenCore.sol";
import "./interface/ITokenDelegate.sol";


/**
 * @title TokenCore
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   TC01: Token cannot be equivalent to AllProxies
 *   TC02: Currency stored values must remain consistent
 *   TC03: Delegate has invalid audit configurations values
 *   TC04: Mismatched between the configuration and the audit storage currency
 *   TC05: The audit triggers definition requires the same number of addresses and values
 **/
contract TokenCore is ITokenCore, OperableCore, TokenStorage {

  /**
   * @dev constructor
   *
   * @dev It is desired for now that delegates
   * @dev cannot be changed once the core has been deployed.
   */
  constructor(string memory _name, address[] memory _sysOperators)
    public OperableCore(_sysOperators)
  {
    name_ = _name;
  }

  function name() override public view returns (string memory) {
    return name_;
  }

  function oracle() override public view returns (
    IUserRegistry userRegistry,
    IRatesProvider ratesProvider,
    address currency)
  {
    return (userRegistry_, ratesProvider_, currency_);
  }

  function auditConfiguration(uint256 _configurationId)
    override public view returns (
      uint256 scopeId,
      AuditMode mode,
      uint256[] memory senderKeys,
      uint256[] memory receiverKeys,
      IRatesProvider ratesProvider,
      address currency)
  {
    AuditConfiguration storage auditConfiguration_ = auditConfigurations[_configurationId];
    return (
      auditConfiguration_.scopeId,
      auditConfiguration_.mode,
      auditConfiguration_.senderKeys,
      auditConfiguration_.receiverKeys,
      auditConfiguration_.ratesProvider,
      audits[address(this)][auditConfiguration_.scopeId].currency
    );
  }

  function auditTriggers(
    uint256 _configurationId, address[] memory _triggers)
    override public view returns (
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

  function delegatesConfigurations(uint256 _delegateId)
    override public view returns (uint256[] memory)
  {
    return delegatesConfigurations_[_delegateId];
  }

  function auditCurrency(
    address _scope,
    uint256 _scopeId
  ) override public view returns (address currency) {
    return audits[_scope][_scopeId].currency;
  }

  function audit(
    address _scope,
    uint256 _scopeId,
    AuditStorageMode _storageMode,
    bytes32 _storageId) override public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint256 cumulatedEmission,
    uint256 cumulatedReception)
  {
    AuditData memory auditData;
    if (_storageMode == AuditStorageMode.SHARED) {
      auditData = audits[_scope][_scopeId].sharedData;
    }
    if (_storageMode == AuditStorageMode.ADDRESS) {
      auditData = audits[_scope][_scopeId].addressData[address(bytes20(_storageId))];
    }
    if (_storageMode == AuditStorageMode.USER_ID) {
      auditData = audits[_scope][_scopeId].userData[uint256(_storageId)];
    }

    createdAt = auditData.createdAt;
    lastTransactionAt = auditData.lastTransactionAt;
    cumulatedEmission = auditData.cumulatedEmission;
    cumulatedReception = auditData.cumulatedReception;
  }

  /**************  ERC20  **************/
  function tokenName() override public view returns (string memory) {
    return tokens[msg.sender].name;
  }

  function tokenSymbol() override public view returns (string memory) {
    return tokens[msg.sender].symbol;
  }

  function decimals() override public onlyProxy returns (uint256) {
    return delegateCallUint256(msg.sender);
  }

  function totalSupply() override public onlyProxy returns (uint256) {
    return delegateCallUint256(msg.sender);
  }

  function balanceOf(address) public onlyProxy override returns (uint256) {
    return delegateCallUint256(msg.sender);
  }

  function allowance(address, address)
    override public onlyProxy returns (uint256)
  {
    return delegateCallUint256(msg.sender);
  }

  function transfer(address, address, uint256)
    override public onlyProxy returns (bool status)
  {
    return delegateCall(msg.sender);
  }

  function transferFrom(address, address, address, uint256)
    override public onlyProxy returns (bool status)
  {
    return delegateCall(msg.sender);
  }

  function approve(address, address, uint256)
    override public onlyProxy returns (bool status)
  {
    return delegateCall(msg.sender);
  }

  function increaseApproval(address, address, uint256)
    override public onlyProxy returns (bool status)
  {
    return delegateCall(msg.sender);
  }

  function decreaseApproval(address, address, uint256)
    override public onlyProxy returns (bool status)
  {
    return delegateCall(msg.sender);
  }

  function canTransfer(address, address, uint256)
    override public onlyProxy returns (uint256)
  {
    return delegateCallUint256(msg.sender);
  }

  /***********  TOKEN DATA   ***********/
  function token(address _token) override public view returns (
    bool mintingFinished,
    uint256 allTimeMinted,
    uint256 allTimeBurned,
    uint256 allTimeSeized,
    uint256[2] memory lock,
    address[] memory lockExceptions,
    uint256 frozenUntil,
    IRule[] memory rules) {
    TokenData storage tokenData = tokens[_token];

    mintingFinished = tokenData.mintingFinished;
    allTimeMinted = tokenData.allTimeMinted;
    allTimeBurned = tokenData.allTimeBurned;
    allTimeSeized = tokenData.allTimeSeized;
    lock = [ tokenData.lock.startAt, tokenData.lock.endAt ];
    lockExceptions = tokenData.lock.exceptionsList;
    frozenUntil = tokenData.frozenUntils[_token];
    rules = tokenData.rules;
  }

  /***********  TOKEN ADMIN  ***********/
  function mint(address _token, address[] calldata, uint256[] calldata)
    override external onlyProxyOp(_token) returns (bool)
  {
    return delegateCall(_token);
  }

  function finishMinting(address _token)
    override external onlyProxyOp(_token) returns (bool)
  {
    return delegateCall(_token);
  }

  function burn(address _token, uint256)
    override external onlyProxyOp(_token) returns (bool)
  {
    return delegateCall(_token);
  }

  function seize(address _token, address, uint256)
    override external onlyProxyOp(_token) returns (bool)
  {
    return delegateCall(_token);
  }

  function freezeManyAddresses(
    address _token,
    address[] calldata,
    uint256) override external onlyProxyOp(_token) returns (bool)
  {
    return delegateCall(_token);
  }

  function defineLock(address _token, uint256, uint256, address[] calldata)
    override external onlyProxyOp(_token) returns (bool)
  {
    return delegateCall(_token);
  }

  function defineRules(address _token, IRule[] calldata)
    override external onlyProxyOp(_token) returns (bool)
  {
    return delegateCall(_token);
  }

  /************  CORE ADMIN  ************/
  function defineToken(
    address _token,
    uint256 _delegateId,
    string calldata _name,
    string calldata _symbol,
    uint256 _decimals)
    override external onlyCoreOp returns (bool)
  {
    require(_token != ALL_PROXIES, "TC01");
    defineProxyInternal(_token, _delegateId);
    TokenData storage tokenData = tokens[_token];
    tokenData.name = _name;
    tokenData.symbol = _symbol;
    tokenData.decimals = _decimals;

    emit TokenDefined(_token, _delegateId, _name, _symbol, _decimals);
    return true;
  }

  function migrateToken(address _token, address _newCore)
    override external onlyCoreOp returns (bool)
  {
    migrateProxyInternal(_token, _newCore);
    emit TokenMigrated(_token, _newCore);
    return true;
  }

  function removeToken(address _token)
    override external onlyCoreOp returns (bool)
  {
    removeProxyInternal(_token);
    delete tokens[_token];

    emit TokenRemoved(_token);
    return true;
  }

  function defineOracle(
    IUserRegistry _userRegistry,
    IRatesProvider _ratesProvider,
    address _currency)
    override external onlyCoreOp returns (bool)
  {
    userRegistry_ = _userRegistry;
    ratesProvider_ = _ratesProvider;
    currency_ = _currency;

    emit OracleDefined(userRegistry_, _ratesProvider, _currency);
    return true;
  }

  function defineTokenDelegate(
    uint256 _delegateId,
    address _delegate,
    uint256[] calldata _auditConfigurations) override external onlyCoreOp returns (bool)
  {
    require(_delegate == address(0) ||
      ITokenDelegate(_delegate).checkConfigurations(_auditConfigurations), "TC03");

    defineDelegateInternal(_delegateId, _delegate);
    if(_delegate != address(0)) {
      delegatesConfigurations_[_delegateId] = _auditConfigurations;
      emit TokenDelegateDefined(_delegateId, _delegate, _auditConfigurations);
    } else {
      delete delegatesConfigurations_[_delegateId];
      emit TokenDelegateRemoved(_delegateId);
    }
    return true;
  }

  function defineAuditConfiguration(
    uint256 _configurationId,
    uint256 _scopeId,
    AuditMode _mode,
    uint256[] calldata _senderKeys,
    uint256[] calldata _receiverKeys,
    IRatesProvider _ratesProvider,
    address _currency) override external onlyCoreOp returns (bool)
  {
    // Mark permanently the core audit storage with the currency to be used with
    AuditStorage storage auditStorage = audits[address(this)][_scopeId];
    if(auditStorage.currency == address(0)) {
      auditStorage.currency = _currency;
    } else {
      require(auditStorage.currency == _currency, "TC04");
    }
   
    AuditConfiguration storage auditConfiguration_ = auditConfigurations[_configurationId];
    auditConfiguration_.mode = _mode;
    auditConfiguration_.scopeId = _scopeId;
    auditConfiguration_.senderKeys = _senderKeys;
    auditConfiguration_.receiverKeys = _receiverKeys;
    auditConfiguration_.ratesProvider = _ratesProvider;

    emit AuditConfigurationDefined(
      _configurationId,
      _scopeId,
      _mode,
      _senderKeys,
      _receiverKeys,
      _ratesProvider,
      _currency);
    return true;
  }

  function removeAudits(address _scope, uint256 _scopeId)
    override external onlyCoreOp returns (bool)
  {
    delete audits[_scope][_scopeId];
    emit AuditsRemoved(_scope, _scopeId);
    return true;
  }

  function defineAuditTriggers(
    uint256 _configurationId,
    address[] calldata _triggerAddresses,
    bool[] calldata _triggerTokens,
    bool[] calldata _triggerSenders,
    bool[] calldata _triggerReceivers) override external onlyCoreOp returns (bool)
  {
    require(_triggerAddresses.length == _triggerSenders.length
      && _triggerAddresses.length == _triggerReceivers.length
      && _triggerAddresses.length == _triggerTokens.length, "TC05");

    AuditConfiguration storage auditConfiguration_ = auditConfigurations[_configurationId];
    for(uint256 i=0; i < _triggerAddresses.length; i++) {
      auditConfiguration_.triggerSenders[_triggerAddresses[i]] = _triggerSenders[i];
      auditConfiguration_.triggerReceivers[_triggerAddresses[i]] = _triggerReceivers[i];
      auditConfiguration_.triggerTokens[_triggerAddresses[i]] = _triggerTokens[i];
    }

    emit AuditTriggersDefined(_configurationId, _triggerAddresses, _triggerTokens, _triggerSenders, _triggerReceivers);
    return true;
  }

  function isSelfManaged(address _owner)
    override external view returns (bool)
  {
    return selfManaged[_owner];
  }

  function manageSelf(bool _active)
    override external returns (bool)
  {
    selfManaged[msg.sender] = _active;
    emit SelfManaged(msg.sender, _active);
  }
}
