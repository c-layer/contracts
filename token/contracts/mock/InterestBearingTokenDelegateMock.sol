pragma solidity ^0.8.0;

import "../delegate/InterestBearingTokenDelegate.sol";
import "./TokenStorageTimeMock.sol";


/**
 * @title InterestBearingTokenDelegateMock
 * @dev Interest Bearing Token Delegate Mock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract InterestBearingTokenDelegateMock is InterestBearingTokenDelegate, TokenStorageTimeMock {

  function currentTime() internal override view returns (uint64) {
    // solhint-disable-next-line not-rely-on-time
    return (uint64)((currentTime_ == 0) ? block.timestamp : currentTime_);
  }
}
