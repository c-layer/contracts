pragma solidity >=0.5.0 <0.6.0;

import "./AuditableTokenDelegate.sol";


/**
 * @title LimitableTransferabilityTokenDelegate
 * @dev LimitableTransferabilityTokenDelegate contract
 * This rule allow a legal authority to limite the transferability.
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messagesa
 * LR01: the currency of the audit configuratioon must matched the compliance currency
 * LR02: the transfer must stay below emission limit
 * LR03: the transfer must stay below reception limit
*/
contract LimitableTransferabilityTokenDelegate is AuditableTokenDelegate {

  /**
   * @dev audit requirements
   **/
  function auditRequirements() public pure returns (uint256) {
    return super.auditRequirements() + 1;
  }

  /**
   * @dev Overriden transfer internal function
   */
  function transferInternal(TransferData memory _transferData) internal returns (bool)
  {
    uint256 configurationId = delegatesConfigurations[proxyDelegateIds[_transferData.token]]
      [uint256(AuditConfigurationCode.LIMITABLE_TRANSFERABILITY)];
    AuditConfiguration storage configuration_ = auditConfigurations[configurationId];

    if (isAuditRequiredInternal(_transferData, configuration_)) {
      AuditStorage storage auditStorage = (
        (configuration_.scopeCore) ? audits[address(this)] : audits[_transferData.token]
      )[configuration_.scopeId];

      require(auditStorage.currency == bytes32(0) || auditStorage.currency == currency_, "LR01");
      require(belowEmissionLimit(_transferData, auditStorage, configuration_), "LR02");
      require(belowReceptionLimit(_transferData, auditStorage, configuration_), "LR03");
    }

    return super.transferInternal(_transferData);
  }

  /**
   * @dev can transfer internal
   */
  function canTransferInternal(TransferData memory _transferData)
    internal view returns (TransferCode)
  {
    uint256 configurationId = delegatesConfigurations[proxyDelegateIds[_transferData.token]]
      [uint256(AuditConfigurationCode.LIMITABLE_TRANSFERABILITY)];
    AuditConfiguration storage configuration_ = auditConfigurations[configurationId];

    if (isAuditRequiredInternal(_transferData, configuration_)) {

      // If the storage currency is set then it must use the compliance currency
      AuditStorage storage auditStorage = (
        (configuration_.scopeCore) ? audits[address(this)] : audits[_transferData.token]
      )[configuration_.scopeId];
      if (auditStorage.currency != bytes32(0) && auditStorage.currency != currency_) {
        return TransferCode.INVALID_CURRENCY_CONFIGURATION;
      }

      if (!belowEmissionLimit(_transferData, auditStorage, configuration_)) {
        return TransferCode.LIMITED_EMISSION;
      }

      if(!belowReceptionLimit(_transferData, auditStorage, configuration_)) {
        return TransferCode.LIMITED_RECEPTION;
      }
    }

    return super.canTransferInternal(_transferData);
  }

  /**
   * @dev belowEmissionLimit
   */
  function belowEmissionLimit(
    TransferData memory _transferData,
    AuditStorage storage _auditStorage,
    AuditConfiguration memory _configuration) private view returns (bool)
  {
    fetchSenderUser(_transferData, _configuration.userKeys);
    if (_transferData.senderId != 0) {
      fetchConvertedValue(
        _transferData,
        _configuration.ratesProvider,
        _configuration.currency);

      if (_transferData.value == 0 || _transferData.convertedValue != 0) {
        AuditData storage auditData = _auditStorage.userData[_transferData.senderId];
        return auditData.cumulatedEmission.add(_transferData.convertedValue)
          <= _transferData.senderKeys[uint256(IUserRegistry.KeyCode.EMISSION_LIMIT_KEY)];
      }
    }

    return false;
  }

  /**
   * @dev belowReceptionLimit
   */
  function belowReceptionLimit(
    TransferData memory _transferData,
    AuditStorage storage _auditStorage,
    AuditConfiguration memory _configuration) private view returns (bool)
  {
    fetchReceiverUser(_transferData, _configuration.userKeys);
    if (_transferData.receiverId != 0) {
      fetchConvertedValue(
        _transferData,
        _configuration.ratesProvider,
        _configuration.currency);

      if (_transferData.value == 0 || _transferData.convertedValue != 0) {
        AuditData storage auditData = _auditStorage.userData[_transferData.receiverId];
        return auditData.cumulatedReception.add(_transferData.convertedValue)
          <= _transferData.receiverKeys[uint256(IUserRegistry.KeyCode.RECEPTION_LIMIT_KEY)];
      }
    }

    return false;
  }
}
