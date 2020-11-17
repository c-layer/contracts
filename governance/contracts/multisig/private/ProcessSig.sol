pragma solidity ^0.6.0;

import "./DelegateSig.sol";


/**
 * @title ProcessSig
 * @dev ProcessSig contract
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * PS01: ETH transfers not allowed
 */
contract ProcessSig is DelegateSig {

  /**
   * @dev fallback function
   */
  constructor(address[] memory _addresses, uint8 _threshold) public
    DelegateSig(_addresses, _threshold)
  {} // solhint-disable-line no-empty-blocks

  /**
   * @dev receive function
   */
  receive() external override payable {
    revert("PS01");
  }

  /**
   * @dev fallback function
   */
  fallback() external override payable {
    revert("PS01");
  }
}
