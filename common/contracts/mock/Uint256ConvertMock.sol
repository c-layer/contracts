pragma solidity ^0.8.0;

import "../convert/Uint256Convert.sol";


/**
 * @title Uint256ConvertMock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract Uint256ConvertMock {
  using Uint256Convert for uint256;

  /**
  * @dev toString
  */
  function convertToString(uint256 _value) public pure returns (string memory) {
    return _value.toString();
  }
}
