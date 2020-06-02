pragma solidity ^0.6.0;

import "../convert/BytesConvert.sol";


/**
 * @title BytesConvertMock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract BytesConvertMock {
  using BytesConvert for bytes;

  /**
  * @dev toUint256
  */
  function toUint256(bytes memory _source) public pure returns (uint256 result) {
    return _source.toUint256();
  }

  /**
  * @dev toBytes32
  */
  function toBytes32(bytes memory _source) public pure returns (bytes32 result) {
    return _source.toBytes32();
  }

}
