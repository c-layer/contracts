pragma solidity >=0.5.0 <0.6.0;

import "./MultiSig.sol";


/**
 * @title LockableSig
 * @dev LockableSig contract
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
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
    public MultiSig(_addresses, _threshold)
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
  function unlock(
    bytes32[] memory _sigR, bytes32[] memory _sigS, uint8[] memory _sigV)
    public
    thresholdRequired(address(this), 0, LOCK, 0,
      threshold_, _sigR, _sigS, _sigV)
  {
    locked_ = false;
  }

  /**
   * @dev override execute internal call
   */
  function executeInternal(address payable _destination, uint256 _value, bytes memory _data)
    internal
  {
    require(!locked_, "LS01");
    super.executeInternal(_destination, _value, _data);
  }
}
