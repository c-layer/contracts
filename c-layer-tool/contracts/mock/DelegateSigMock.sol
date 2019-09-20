pragma solidity >=0.5.0 <0.6.0;

import "../multisig/private/DelegateSig.sol";


/**
 * @title DelegateSigMock
 * @dev Mock the DelegateSig class
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */
contract DelegateSigMock is DelegateSig {
  /**
   * @dev constructor
   */
  constructor(address[] memory _signers, uint8 _threshold)
    public MultiSig(_signers, _threshold)
  {} // solhint-disable-line no-empty-blocks
}
