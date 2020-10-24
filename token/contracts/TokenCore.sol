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
      AuditTriggerMode mode,
      uint256[] memory senderKeys,
      uint256[] memory receiverKeys,
      IRatesProvider ratesProvider,
      address currency)
  {
    AuditConfiguration storage auditConfiguration_ = auditConfigurations[_configurationId];
    return (
      auditConfiguration_.scopeId,
      auditConfiguration_.triggers[ANY_ADDRESSES][ANY_ADDRESSES],
      auditConfiguration_.senderKeys,
      auditConfiguration_.receiverKeys,
      auditConfiguration_.ratesProvider,
      audits[address(this)][auditConfiguration_.scopeId].currency
    );
  }

  function auditTrigger(uint256 _configurationId, address _sender, address _receiver)
    override public view returns (AuditTriggerMode)
  {
    return auditConfigurations[_configurationId].triggers[_sender][_receiver];
  }

  function delegatesConfigurations(uint256 _delegateId)
    override public view returns (uint256[] memory)
  {
    return delegatesConfigurations_[_delegateId];
  }

  function auditCurrency(
    address _scope,
    uint256 _scopeId
  ) override external view returns (address currency) {
    return audits[_scope][_scopeId].currency;
  }

  function audit(
    address _scope,
    uint256 _scopeId,
    AuditStorageMode _storageMode,
    bytes32 _storageId) override external view returns (
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
  function tokenName() override external view returns (string memory) {
    return tokens[msg.sender].name;
  }

  function tokenSymbol() override external view returns (string memory) {
    return tokens[msg.sender].symbol;
  }

  function decimals() override external onlyProxy returns (uint256) {
    return delegateCallUint256(msg.sender);
  }

  function totalSupply() override external onlyProxy returns (uint256) {
    return delegateCallUint256(msg.sender);
  }

  function balanceOf(address) external onlyProxy override returns (uint256) {
    return delegateCallUint256(msg.sender);
  }

  function allowance(address, address)
    override external onlyProxy returns (uint256)
  {
    return delegateCallUint256(msg.sender);
  }

  function transfer(address, address, uint256)
    override external onlyProxy returns (bool status)
  {
    return delegateCall(msg.sender);
  }

  function transferFrom(address, address, address, uint256)
    override external onlyProxy returns (bool status)
  {
    return delegateCall(msg.sender);
  }

  function approve(address, address, uint256)
    override external onlyProxy returns (bool status)
  {
    return delegateCall(msg.sender);
  }

  function increaseApproval(address, address, uint256)
    override external onlyProxy returns (bool status)
  {
    return delegateCall(msg.sender);
  }

  function decreaseApproval(address, address, uint256)
    override external onlyProxy returns (bool status)
  {
    return delegateCall(msg.sender);
  }

  /***********  TOKEN DATA   ***********/
  function token(address _token) override external view returns (
    bool mintingFinished,
    uint256 allTimeMinted,
    uint256 allTimeBurned,
    uint256 allTimeSeized,
    address[] memory locks,
    uint256 frozenUntil,
    IRule[] memory rules) {
    TokenData storage tokenData = tokens[_token];

    mintingFinished = tokenData.mintingFinished;
    allTimeMinted = tokenData.allTimeMinted;
    allTimeBurned = tokenData.allTimeBurned;
    allTimeSeized = tokenData.allTimeSeized;
    locks = tokenData.locks;
    frozenUntil = tokenData.frozenUntils[_token];
    rules = tokenData.rules;
  }

  function lock(address _lock) override external view returns (
    uint256 startAt, uint256 endAt,
    address[] memory exceptions)
  {
    Lock storage lock_ = locks[_lock];
    return (lock_.startAt, lock_.endAt, lock_.exceptionsList);
  }

  function canTransfer(address, address, uint256)
    override external onlyProxy returns (uint256)
  {
    return delegateCallUint256(msg.sender);
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

  function defineLock(address _lock, uint256, uint256, address[] calldata)
    override external onlyProxyOp(_lock) returns (bool)
  {
    return delegateCall(_lock);
  }

  function defineTokenLocks(address _token, address[] calldata)
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
  function removeProxyInternal(address _token)
    internal override returns (bool)
  {
    super.removeProxyInternal(_token);
    delete tokens[_token];
    return true;
  }

  function defineToken(
    address _token,
    uint256 _delegateId,
    string calldata _name,
    string calldata _symbol,
    uint256 _decimals)
    override external onlyCoreOp returns (bool)
  {
    require(_token != ALL_PROXIES, "TC01");
    defineProxy(_token, _delegateId);
    TokenData storage tokenData = tokens[_token];
    tokenData.name = _name;
    tokenData.symbol = _symbol;
    tokenData.decimals = _decimals;

    emit TokenDefined(_token, _name, _symbol, _decimals);
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
    AuditTriggerMode _mode,
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
    auditConfiguration_.scopeId = _scopeId;
    auditConfiguration_.senderKeys = _senderKeys;
    auditConfiguration_.receiverKeys = _receiverKeys;
    auditConfiguration_.ratesProvider = _ratesProvider;
    auditConfiguration_.triggers[ANY_ADDRESSES][ANY_ADDRESSES] = _mode;

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
    address[] calldata _senders,
    address[] calldata _receivers,
    AuditTriggerMode[] calldata _modes) override external onlyCoreOp returns (bool)
  {
    require(_senders.length == _receivers.length && _senders.length == _modes.length, "TC05");

    AuditConfiguration storage auditConfiguration_ = auditConfigurations[_configurationId];
    for(uint256 i=0; i < _senders.length; i++) {
      auditConfiguration_.triggers[_senders[i]][_receivers[i]] = _modes[i];
    }

    emit AuditTriggersDefined(_configurationId, _senders, _receivers, _modes);
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
