pragma solidity ^0.6.0;

import "@c-layer/common/contracts/interface/IOperableCore.sol";
import "./ITokenStorage.sol";


/**
 * @title ITokenCore
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 **/
abstract contract ITokenCore is ITokenStorage, IOperableCore {

  function name() virtual public view returns (string memory);
  function oracle() virtual public view returns (
    IUserRegistry userRegistry,
    IRatesProvider ratesProvider,
    address currency);

  function auditConfiguration(uint256 _configurationId)
    virtual public view returns (
      uint256 scopeId,
      AuditMode mode,
      uint256[] memory senderKeys,
      uint256[] memory receiverKeys,
      IRatesProvider ratesProvider,
      address currency);
  function auditTriggers(
    uint256 _configurationId,
    address[] memory _triggers) virtual public view returns (
    bool[] memory senders,
    bool[] memory receivers,
    bool[] memory tokens);
  function delegatesConfigurations(uint256 _delegateId)
    virtual public view returns (uint256[] memory);

  function auditCurrency(
    address _scope,
    uint256 _scopeId
  ) virtual public view returns (address currency);
  function audit(
    address _scope,
    uint256 _scopeId,
    AuditStorageMode _storageMode,
    bytes32 _storageId) virtual public view returns (
    uint64 createdAt,
    uint64 lastTransactionAt,
    uint256 cumulatedEmission,
    uint256 cumulatedReception);

  /**************  ERC20  **************/
  function tokenName() virtual public view returns (string memory);
  function tokenSymbol() virtual public view returns (string memory);

  function decimals() virtual public returns (uint256);
  function totalSupply() virtual public returns (uint256);
  function balanceOf(address) virtual public returns (uint256);
  function allowance(address, address) virtual public returns (uint256);
  function transfer(address, address, uint256)
    virtual public returns (bool status);
  function transferFrom(address, address, address, uint256)
    virtual public returns (bool status);
  function approve(address, address, uint256)
    virtual public returns (bool status);
  function increaseApproval(address, address, uint256)
    virtual public returns (bool status);
  function decreaseApproval(address, address, uint256)
    virtual public returns (bool status);

  /***********  TOKEN DATA   ***********/
  function token(address _token) virtual public view returns (
    bool mintingFinished,
    uint256 allTimeMinted,
    uint256 allTimeBurned,
    uint256 allTimeSeized,
    uint256[2] memory lock,
    address[] memory lockExceptions,
    uint256 freezedUntil,
    IRule[] memory);
  function canTransfer(address, address, uint256)
    virtual public returns (uint256);

  /***********  TOKEN ADMIN  ***********/
  function mint(address, address[] calldata, uint256[] calldata)
    virtual external returns (bool);
  function finishMinting(address)
    virtual external returns (bool);
  function burn(address, uint256)
    virtual external returns (bool);
  function seize(address _token, address, uint256)
    virtual external returns (bool);
  function freezeManyAddresses(
    address _token,
    address[] calldata _addresses,
    uint256 _until) virtual external returns (bool);
  function defineLock(address, uint256, uint256, address[] calldata)
    virtual external returns (bool);
  function defineRules(address, IRule[] calldata) virtual external returns (bool);

  /************  CORE ADMIN  ************/
  function defineToken(
    address _token,
    uint256 _delegateId,
    string memory _name,
    string memory _symbol,
    uint256 _decimals) virtual external returns (bool);
  function migrateToken(address _token, address _newCore)
    virtual external returns (bool);
  function removeToken(address _token) virtual external returns (bool);

  function defineOracle(
    IUserRegistry _userRegistry,
    IRatesProvider _ratesProvider,
    address _currency) virtual external returns (bool);
  function defineTokenDelegate(
    uint256 _delegateId,
    address _delegate,
    uint256[] calldata _configurations) virtual external returns (bool);
  function defineAuditConfiguration(
    uint256 _configurationId,
    uint256 _scopeId,
    AuditMode _mode,
    uint256[] calldata _senderKeys,
    uint256[] calldata _receiverKeys,
    IRatesProvider _ratesProvider,
    address _currency) virtual external returns (bool);
  function removeAudits(address _scope, uint256 _scopeId)
    virtual external returns (bool);
  function defineAuditTriggers(
    uint256 _configurationId,
    address[] calldata _triggerAddresses,
    bool[] calldata _triggerSenders,
    bool[] calldata _triggerReceivers,
    bool[] calldata _triggerTokens) virtual external returns (bool);

  function isSelfManaged(address _owner)
    virtual external view returns (bool);
  function manageSelf(bool _active)
    virtual external returns (bool);
}
