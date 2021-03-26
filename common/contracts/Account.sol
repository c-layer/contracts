pragma solidity ^0.8.0;


/**
 * @title Account
 * @dev Utility regarding account interaction
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error Messages:
 **/
library Account {
  /**
   * @dev isContract
   */ 
  function isContract(address _account) internal view returns (bool) {
    uint size;
    // solhint-disable-next-line no-inline-assembly
    assembly { size := extcodesize(_account) }
    return size > 0;
  }
}
