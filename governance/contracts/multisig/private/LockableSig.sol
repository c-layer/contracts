pragma solidity ^0.8.0;

import "./MultiSig.sol";


/**
 * @title LockableSig
 * @dev LockableSig contract
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * LS01: Contract must be unlocked to execute
 */
contract LockableSig is MultiSig {

  bytes public constant LOCK = abi.encodePacked(keccak256("LOCK"));
  bool internal locked_;

  /**
   * @dev constructor
   */
  constructor(address[] memory _addresses, uint8 _threshold)
    MultiSig(_addresses, _threshold)
  {} // solhint-disable-line no-empty-blocks

  /**
   * @dev is the contract locked
   */
  function isLocked() public view returns (bool) {
    return locked_;
  }

  /**
   * @dev lock the contract
   */
  function lock() public onlySigners {
    locked_ = true;
  }

  /**
   * @dev unlock the contract
   */
  function unlock(bytes [] memory _signatures) public
    thresholdRequired(_signatures, address(this), 0, LOCK, 0, threshold_)
  {
    locked_ = false;
  }

  /**
   * @dev override execute internal call
   */
  function executeInternal(address payable _destination, uint256 _value, bytes memory _data)
    internal override
  {
    require(!locked_, "LS01");
    super.executeInternal(_destination, _value, _data);
  }
}
