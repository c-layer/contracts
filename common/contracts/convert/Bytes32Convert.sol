pragma solidity ^0.8.0;


/**
 * @title Bytes32Convert
 * @dev Convert bytes32 to string
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 **/
library Bytes32Convert {

  /**
  * @dev toString
  */
  function toString(bytes32 _input) internal pure returns (string memory result) {
    bytes memory reversed = new bytes(32);
    uint256 i = 0;
    uint256 v = uint256(_input);
    while (v != 0) {
      reversed[i++] = bytes1(uint8(48 + (v % 16)));
      v = v / 16;
    }
    bytes memory s = new bytes(i);
    for (uint j = 0; j < i; j++) {
      s[j] = reversed[i - j - 1];
    }

    result = string(s);
  }
}
