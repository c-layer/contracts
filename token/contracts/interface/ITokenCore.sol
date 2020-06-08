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
      bool scopeCore,
      AuditMode mode,
      AuditStorageMode storageMode,
      uint256[] memory senderKeys,
      uint256[] memory receiverKeys,
      IRatesProvider ratesProvider,
      address currency,
      bool[4] memory fields);
  function auditTriggers(
    uint256 _configurationId,
    address[] memory _triggers) virtual public view returns (
    bool[] memory senders,
    bool[] memory receivers,
    bool[] memory tokens);
  function delegateConfigurations(uint256 _delegateId)
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
    uint256 freezedUntil,
    IRule[] memory,
    uint256 latestClaimAt);
  function frozenUntil(address _token, address _holder)
    virtual public view returns (uint256);
  function tokenProofs(address _token, address _holder, uint256 _proofId)
    virtual public view returns (uint256, uint64, uint64);
  function canTransfer(address, address, uint256)
    virtual public returns (uint256);

  /***********  TOKEN ADMIN  ***********/
  function mint(address, address[] memory, uint256[] memory)
    virtual public returns (bool);
  function finishMinting(address)
    virtual public returns (bool);
  function burn(address, uint256)
    virtual public returns (bool);
  function seize(address _token, address, uint256)
    virtual public returns (bool);
  function freezeManyAddresses(
    address _token,
    address[] memory _addresses,
    uint256 _until) virtual public returns (bool);
  function createProof(address, address)
    virtual public returns (bool);
  function defineLock(address, uint256, uint256, address[] memory)
    virtual public returns (bool);
  function defineRules(address, IRule[] memory) virtual public returns (bool);
  function defineClaim(address, address, uint256) virtual public returns (bool);

  /************  CORE ADMIN  ************/
  function defineToken(
    address _token,
    uint256 _delegateId,
    string memory _name,
    string memory _symbol,
    uint256 _decimals) virtual public returns (bool);
  function migrateToken(address _token, address _newCore)
    virtual public returns (bool);
  function removeToken(address _token) virtual public returns (bool);

  function defineOracle(
    IUserRegistry _userRegistry,
    IRatesProvider _ratesProvider,
    address _currency) virtual external returns (bool);
  function defineTokenDelegate(
    uint256 _delegateId,
    address _delegate,
    uint256[] memory _configurations) virtual public returns (bool);
  function defineAuditConfiguration(
    uint256 _configurationId,
    uint256 _scopeId,
    bool _scopeCore,
    AuditMode _mode,
    AuditStorageMode _storageMode,
    uint256[] memory senderKeys,
    uint256[] memory receiverKeys,
    IRatesProvider _ratesProvider,
    address _currency,
    bool[4] memory _fields) virtual public returns (bool);
  function removeAudits(address _scope, uint256 _scopeId)
    virtual public returns (bool);
  function defineAuditTriggers(
    uint256 _configurationId,
    address[] memory _triggerAddresses,
    bool[] memory _triggerSenders,
    bool[] memory _triggerReceivers,
    bool[] memory _triggerTokens) virtual public returns (bool);

  function isSelfManaged(address _owner)
    virtual public view returns (bool);
  function manageSelf(bool _active)
    virtual public returns (bool);
}
