pragma solidity ^0.6.0;

import "../delegate/LimitableTransferabilityDelegate.sol";
import "./DelegateMock.sol";


/**
 * @title LimitableTransferabilityDelegateMock
 * @dev LimitableTransferabilityDelegateMock contract
 * Provides individual limits over token emission and reception
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * FTD01: The address is frozen
 */
contract LimitableTransferabilityDelegateMock is LimitableTransferabilityDelegate, DelegateMock {

  /**
   * @dev testIsBelowTransferLimits
   */
  function testIsBelowTransferLimits(address _token,
    address _caller, address _sender, address _receiver,
    uint256 _value) public view returns (TransferCode)
  {
    STransferData memory transferData_ = transferData(
      _token, _caller, _sender, _receiver, _value);

    return isTransferBelowLimits(transferData_);
  }
}
