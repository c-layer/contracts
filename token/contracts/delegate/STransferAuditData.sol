pragma solidity ^0.8.0;

import "@c-layer/oracle/contracts/interface/IRatesProvider.sol";


/**
 * @title STransferAuditData
 * @dev SAuditData structure
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
**/

struct STransferAuditData {
  uint256 auditConfigurationId;
  uint256 scopeId;
  address currency;
  IRatesProvider ratesProvider;

  bool senderAuditRequired;
  bool receiverAuditRequired;
}
