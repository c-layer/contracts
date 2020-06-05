pragma solidity ^0.6.0;

import "../delegate/FreezableDelegate.sol";
import "./DelegateMock.sol";


/**
 * @title FreezableDelegateMock
 * @dev FreezableDelegateMock contract
 * This rule allow a legal authority to enforce a freeze of assets.
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * FTD01: The address is frozen
 */
contract FreezableDelegateMock is FreezableDelegate, DelegateMock {

  /**
   * @dev testIsFrozen
   */
  function testIsFrozen(address _token,
    address _caller, address _sender, address _receiver,
    uint256 _value) public view returns (bool)
  {
    STransferData memory transferData_ = transferData(
      _token, _caller, _sender, _receiver, _value);

    return isFrozen(transferData_);
  }
}
