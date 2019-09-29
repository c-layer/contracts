pragma solidity >=0.5.0 <0.6.0;


/**
 * @title BytesConvert
 * @dev Convert bytes into different types
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
library BytesConvert {

  /**
  * @dev toUint256
  */
  function toUint256(bytes memory source) internal pure returns (uint256 result) {
    // solhint-disable-next-line no-inline-assembly
    assembly {
      result := mload(add(source, 0x20))
    }
  }

  /**
  * @dev toBytes32
  */
  function toBytes32(bytes memory source) internal pure returns (bytes32 result) {
    // solhint-disable-next-line no-inline-assembly
    assembly {
      result := mload(add(source, 0x20))
    }
  }
}
