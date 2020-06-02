pragma solidity ^0.6.0;


/**
 * @title BytesConvert
 * @dev Convert bytes into different types
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error Messages:
 *   BC01: source must be a valid 32-bytes length
 *   BC02: source must not be greater than 32-bytes
 **/
library BytesConvert {

  /**
  * @dev toUint256
  */
  function toUint256(bytes memory _source) internal pure returns (uint256 result) {
    require(_source.length == 32, "BC01");
    // solhint-disable-next-line no-inline-assembly
    assembly {
      result := mload(add(_source, 0x20))
    }
  }

  /**
  * @dev toBytes32
  */
  function toBytes32(bytes memory _source) internal pure returns (bytes32 result) {
    require(_source.length <= 32, "BC02");
    // solhint-disable-next-line no-inline-assembly
    assembly {
      result := mload(add(_source, 0x20))
    }
  }
}
