pragma solidity ^0.8.0;

import "../delegate/STransferData.sol";
import "../delegate/STransferAuditData.sol";
import "../TokenStorage.sol";


/**
 * @title Delegate Mock
 * @dev Delegate Mock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract DelegateMock is TokenStorage {

  uint256 internal constant CURRENCY_RATE = 1500;
  mapping(address => uint256[]) public users;

  /**
   * @dev logTransferData
   */
  function logTransferData(STransferData memory _transferData) internal {
    emit LogTransferData (
      _transferData.token,
      _transferData.caller,
      _transferData.sender,
      _transferData.receiver,
      _transferData.senderId,
      _transferData.senderKeys,
      _transferData.senderFetched,
      _transferData.receiverId,
      _transferData.receiverKeys,
      _transferData.receiverFetched,
      _transferData.value,
      _transferData.convertedValue);
  }

  /**
   * @dev logTransferAudtData
   */
  function logTransferAuditData(STransferAuditData memory _transferAuditData) internal {
    emit LogTransferAuditData (
      _transferAuditData.auditConfigurationId,
      _transferAuditData.scopeId,
      _transferAuditData.currency,
      _transferAuditData.ratesProvider,
      _transferAuditData.senderAuditRequired,
      _transferAuditData.receiverAuditRequired);
  }

  /**
   * @dev logAllAuditsData
   */
  function logAllAuditsData(uint256[] memory _configurationIds,
    STransferData memory _transferData) internal
  {
    for (uint256 i=0; i < _configurationIds.length; i++) {
      logAuditData(_configurationIds[i], _transferData);
    }
  }

   /**
   * @dev logAuditData
   */
  function logAuditData(uint256 _configurationId,
    STransferData memory _transferData) internal
  {
    AuditConfiguration storage configuration =
      auditConfigurations[_configurationId];
    address scope = address(this);
    AuditStorage storage auditStorage = audits[scope][configuration.scopeId];

    AuditData storage audit_ = auditStorage.sharedData;
    emit LogAuditData(
      audit_.createdAt,
      audit_.lastTransactionAt,
      audit_.cumulatedEmission,
      audit_.cumulatedReception);

    audit_ = auditStorage.addressData[_transferData.sender];
    emit LogAuditData(
      audit_.createdAt,
      audit_.lastTransactionAt,
      audit_.cumulatedEmission,
      audit_.cumulatedReception);

    audit_ = auditStorage.addressData[_transferData.receiver];
    emit LogAuditData(
      audit_.createdAt,
      audit_.lastTransactionAt,
      audit_.cumulatedEmission,
      audit_.cumulatedReception);

    if(_transferData.senderId != 0) {
      audit_ = auditStorage.userData[_transferData.senderId];
      emit LogAuditData(
        audit_.createdAt,
        audit_.lastTransactionAt,
        audit_.cumulatedEmission,
        audit_.cumulatedReception);
    }

    if(_transferData.receiverId != 0) {
      audit_ = auditStorage.userData[_transferData.receiverId];
      emit LogAuditData(
        audit_.createdAt,
        audit_.lastTransactionAt,
        audit_.cumulatedEmission,
        audit_.cumulatedReception);
    }
  }

  /**
   * @dev transferData
   */
  function transferData(
    address _token, address _caller,
    address _sender, address _receiver, uint256 _value)
    internal pure returns (STransferData memory)
  {
    uint256[] memory emptyArray = new uint256[](0);
    return STransferData(
      _token,
      _caller,
      _sender,
      _receiver,
      0,
      emptyArray,
      false,
      0,
      emptyArray,
      false,
      _value,
      0);
  }

  /**
   * @dev convert
   */
  function convert(uint256 _amount, bytes32, bytes32)
    external view returns (uint256)
  {
    // Prevent the method from being pure
    this;

    return _amount * CURRENCY_RATE / 1000;
  }

  /**
   * @dev validUserId
   */
  function validUserId(address _address)
    external view returns (uint256)
  {
    uint256[] storage user = users[_address];
    return user[0];
  }

  /**
   * @dev validUser
   */
  function validUser(address _address, uint256[] calldata _keys)
    external view returns (uint256, uint256[] memory)
  {
    uint256[] storage user = users[_address];
    uint256[] memory values = new uint256[](_keys.length);
    for(uint256 i=0; i < _keys.length; i++) {
      values[i] = user[i+1];
    }
    return (user[0], values);
  }

  /**
   * @dev defineUsers
   */
  function defineUsers(
    address[] calldata _users,
    uint256[] calldata _emissionLimits,
    uint256[] calldata _receptionLimits) external returns (bool)
  {
    userRegistry_ = IUserRegistry(address(this));
    for(uint256 i=0; i < _users.length; i++) {
      users[_users[i]] = [ i+1, _emissionLimits[i], _receptionLimits[i] ];
    }
    return true;
  }

  /**
   * @dev defineOracle
   */
  function defineOracle(IUserRegistry _userRegistry,
    IRatesProvider _ratesProvider,
    address _currency) public {
    userRegistry_ = _userRegistry;
    ratesProvider_ = _ratesProvider;
    currency_ = _currency;
  }

  /**
   * @dev defineAuditConfiguration
   */
  function defineAuditConfiguration(
    uint256 _configurationId,
    uint256 _scopeId,
    AuditTriggerMode _mode,
    uint256[] memory _senderKeys,
    uint256[] memory _receiverKeys,
    IRatesProvider _ratesProvider,
    address _currency) public returns (bool)
  {
    // Mark permanently the core audit storage with the currency to be used with
    audits[address(this)][_scopeId].currency = _currency;

    AuditConfiguration storage auditConfiguration_ = auditConfigurations[_configurationId];
    auditConfiguration_.scopeId = _scopeId;
    auditConfiguration_.senderKeys = _senderKeys;
    auditConfiguration_.receiverKeys = _receiverKeys;
    auditConfiguration_.ratesProvider = _ratesProvider;
    auditConfiguration_.triggers[ANY_ADDRESSES][ANY_ADDRESSES] = _mode;

    emit LogAuditMode(ANY_ADDRESSES, ANY_ADDRESSES, _mode);
    return true;
  }

  event LogAuditMode(address sender, address receiver, AuditTriggerMode mode);

  /**
   * @dev defineAuditTriggers
   */
  function defineAuditTriggers(
    uint256 _configurationId,
    address[] memory _senders,
    address[] memory _receivers,
    AuditTriggerMode[] memory _modes) public returns (bool)
  {
    require(_senders.length == _receivers.length
      && _senders.length == _modes.length, "TC06");

    AuditConfiguration storage auditConfiguration_ = auditConfigurations[_configurationId];
    for(uint256 i=0; i < _senders.length; i++) {
      auditConfiguration_.triggers[_senders[i]][_receivers[i]] = _modes[i];
      emit LogAuditMode(_senders[i], _receivers[i], _modes[i]);
    }

    emit AuditTriggersDefined(_configurationId, _senders, _receivers, _modes);
    return true;
  }
}
