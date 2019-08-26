pragma solidity >=0.5.0 <0.6.0;


/**
 * @title BytesConvert
 * @dev Convert bytes into different types
 */
library BytesConvert {

  /**
  * @dev toUint256
  */
  function toUint256(bytes memory b) internal pure returns (uint256 c) {
    assembly {
      c := mload(add(b, add(0x20, 0)))
    }
  }
}
