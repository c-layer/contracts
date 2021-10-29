pragma solidity ^0.8.0;


/**
 * @title Uint256Convert
 * @dev Convert bytes32 to string
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 **/
library Uint256Convert {

  /**
  * @dev toString
  */
  function toString(uint256 _input) internal pure returns (string memory) {
    if (_input == 0) {
      return "0";
    }

    uint256 i;
    uint256 v = _input;
    while (v != 0) {
      i++;
      v /= 10;
    }

    bytes memory result = new bytes(i);
    while(_input != 0) {
      result[--i] = bytes1(uint8(48 + uint256(_input % 10)));
      _input /= 10;
    }

    return string(result);
  }
}
