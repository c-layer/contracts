pragma solidity >=0.5.0 <0.6.0;

import "./LockableSig.sol";
import "./DelegateSig.sol";


/**
 * @title ProcessSig
 * @dev ProcessSig contract
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 *
 * Error messages
 * E01: ETH transfers not allowed
 */
contract ProcessSig is DelegateSig, LockableSig {

  /**
   * @dev fallback function
   */
  constructor(address[] memory _addresses, uint8 _threshold) public
    LockableSig(_addresses, _threshold)
  {} // solhint-disable-line no-empty-blocks

  /**
   * @dev fallback function
   */
  function () external payable {
    revert("E01");
  }
}
