pragma solidity ^0.6.0;

/**
 * @title STransferData
 * @dev STransferData structure
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * @notice Beware that claimables should only check if a claims exists
 * @notice Adding too many claims or too costly claims may prevents
 * @notice transfers due to a gas cost too high.
 * @notice Removing claims will resume the situation.
**/


struct STransferData {
  address token;
  address caller;
  address sender;
  address receiver;

  uint256 senderId;
  uint256[] senderKeys;
  bool senderFetched;

  uint256 receiverId;
  uint256[] receiverKeys;
  bool receiverFetched;

  uint256 value;
  uint256 convertedValue;
}
