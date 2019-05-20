pragma solidity >=0.5.0 <0.6.0;

import "../multisig/private/DelegateSig.sol";


/**
 * @title DelegateSigMock
 * @dev Mock the DelegateSig class
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */
contract DelegateSigMock is DelegateSig {
  /**
   * @dev constructor
   */
  constructor(address[] memory _signers, uint8 _threshold)
    MultiSig(_signers, _threshold) public {
  }
}
