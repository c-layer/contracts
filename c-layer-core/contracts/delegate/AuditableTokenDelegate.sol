pragma solidity >=0.5.0 <0.6.0;

import "./BaseTokenDelegate.sol";
import "../util/convert/BytesConvert.sol";


/**
 * @title AuditableTokenDelegate
 * @dev Auditable token contract
 * Auditable provides transaction data which can be used
 * in other smart contracts
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * AT01: Currency must be defined for core scope
 * AT02: RatesProvider must be defined for core scope
 * AT03: UserRegistry must be defined for ByUser data mode
 **/
contract AuditableTokenDelegate is BaseTokenDelegate {
  using BytesConvert for bytes;

  bytes2 constant private SCOPE_ID_MODE = 0x001f;
  bytes2 constant private SCOPE_CORE_MODE = 0x0020;
  bytes2 constant private AUDIT_DATA_MODE = 0x00c0;
  bytes2 constant private SELECTOR_FROM_MODE = 0x0100;
  bytes2 constant private SELECTOR_TO_MODE = 0x0200;
  bytes2 constant private FIELD_CREATED_AT_MODE = 0x0400;
  bytes2 constant private FIELD_LAST_TRANSACTION_AT_MODE = 0x0800;
  bytes2 constant private FIELD_LAST_EMISSION_AT_MODE = 0x1000;
  bytes2 constant private FIELD_LAST_RECEPTION_AT_MODE = 0x2000;
  bytes2 constant private FIELD_CUMULATED_EMISSION_MODE = 0x4000;
  bytes2 constant private FIELD_CUMULATED_RECEPTION_MODE = 0x8000;

  /**
   * @dev evalAuditMode
   **/
  function evalAuditMode(bytes2 _auditMode) public pure returns (
    uint16 scopeId,
    bool isTokenScope,
    uint16 auditData,
    bool isSelectorFrom,
    bool isSelectorTo,
    bool[6] memory fields) {

    scopeId = uint16(_auditMode & SCOPE_ID_MODE);
    isTokenScope = !(_auditMode & SCOPE_CORE_MODE != bytes2(0));
    auditData = uint16(_auditMode & AUDIT_DATA_MODE) >> 6;
    isSelectorFrom = _auditMode & SELECTOR_FROM_MODE != bytes2(0);
    isSelectorTo = _auditMode & SELECTOR_TO_MODE != bytes2(0);

    fields = [
      _auditMode & FIELD_CREATED_AT_MODE != bytes2(0),
      _auditMode & FIELD_LAST_TRANSACTION_AT_MODE != bytes2(0),
      _auditMode & FIELD_LAST_EMISSION_AT_MODE != bytes2(0),
      _auditMode & FIELD_LAST_RECEPTION_AT_MODE != bytes2(0),
      _auditMode & FIELD_CUMULATED_EMISSION_MODE != bytes2(0),
      _auditMode & FIELD_CUMULATED_RECEPTION_MODE != bytes2(0)
    ];
  }

  /**
   * @dev Overriden transfer function
   */
  function transfer(address _sender, address _to, uint256 _value)
    public returns (bool)
  {
    require(super.transfer(_sender, _to, _value));
    updateAudit(_sender, _to, _value);
    return true;
  }

  /**
   * @dev Overriden transferFrom function
   */
  function transferFrom(address _sender, address _from, address _to, uint256 _value)
    public returns (bool)
  {
    require(super.transferFrom(_sender, _from, _to, _value));
    updateAudit(_from, _to, _value);
    return true;
  }

  /**
   * @dev Update audit data
   */
  function updateAudit(address _sender, address _receiver, uint256 _value)
    private
  {
    TokenData storage token = tokens_[msg.sender];
    AuditConfig[] storage auditConfigs = delegateAuditConfigs_[proxyDelegates[msg.sender]];

    for(uint256 i=0; i < auditConfigs.length; i++) {
      AuditConfig storage auditConfig = auditConfigs[i];
      bytes2 auditMode = auditConfig.auditMode;

      /**** FILTERS ****/
      if(auditMode & SELECTOR_FROM_MODE != bytes2(0) && !auditConfig.fromSelector[_sender]) {
        continue;
      }
      if(auditMode & SELECTOR_TO_MODE != bytes2(0) && !auditConfig.toSelector[_receiver]) {
        continue;
      }

      /**** AUDIT STORAGE ****/
      bool isTokenScope = (auditMode & SCOPE_CORE_MODE) == bytes2(0);
      require(isTokenScope || currency != 0x0, "AT01");
      require(isTokenScope || address(ratesProvider) != address(0), "AT02");
      AuditData storage auditData = (
        (isTokenScope) ? token.audits : audits
      )[uint16(auditMode & SCOPE_ID_MODE)];

      /**** UPDATE AUDIT DATA ****/
      uint16 auditDataMode = uint16(auditMode & AUDIT_DATA_MODE) >> 6;
      uint256 convertedValue = (isTokenScope) ? _value :
         ratesProvider.convert(
           _value,
           bytes(token.symbol).toBytes32(),
           currency);

      if (auditDataMode == 0 /* AuditData.shared */) {
        updateAuditDataStorage(
          auditMode,
          auditData.shared,
          auditData.shared,
          convertedValue);
      }
      if (auditDataMode == 1 /* AuditData.byUser */) {
        require(address(userRegistry) != address(0), "AT03");
        uint256 senderUserId = userRegistry.userId(_sender);
        uint256 receivedUserId = userRegistry.userId(_receiver);
        updateAuditDataStorage(
          auditMode,
          auditData.byUser[senderUserId],
          auditData.byUser[receivedUserId],
          convertedValue);
      }
      if (auditDataMode == 2 /* AuditData.byAddress */) {
        updateAuditDataStorage(
          auditMode,
          auditData.byAddress[_sender],
          auditData.byAddress[_receiver],
          convertedValue);
      }
    }
  }

  function updateAuditDataStorage(
    bytes2 _auditMode,
    AuditDataStorage storage _senderStorage,
    AuditDataStorage storage _receiverStorage,
    uint256 _convertedValue
  ) private {
    uint64 currentTime = currentTime();
    if(_auditMode & FIELD_CREATED_AT_MODE != bytes2(0)) {
      if(_senderStorage.createdAt == 0) {
        _senderStorage.createdAt = currentTime;
      }
      if(_receiverStorage.createdAt == 0) {
        _receiverStorage.createdAt = currentTime;
      }
    }
    if(_auditMode & FIELD_LAST_TRANSACTION_AT_MODE != bytes2(0)) {
      _senderStorage.lastTransactionAt = currentTime;
      _receiverStorage.lastTransactionAt = currentTime;
    }
    if(_auditMode & FIELD_LAST_EMISSION_AT_MODE != bytes2(0)) {
      _senderStorage.lastEmissionAt = currentTime;
    }
    if(_auditMode & FIELD_LAST_RECEPTION_AT_MODE != bytes2(0)) {
      _receiverStorage.lastReceptionAt = currentTime;
    }
    if(_auditMode & FIELD_CUMULATED_EMISSION_MODE != bytes2(0)) {
      _senderStorage.cumulatedEmission += _convertedValue;
    }
    if(_auditMode & FIELD_CUMULATED_RECEPTION_MODE != bytes2(0)) {
      _receiverStorage.cumulatedReception += _convertedValue;
    }
  }
}
