pragma solidity ^0.8.0;

import "@c-layer/common/contracts/token/TokenERC20.sol";
import "./LockableTransfer.sol";


/**
 * @title LockableERC20
 * @dev LockableERC20 contract
 * This contract provides locking on a ERC20 token
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   LE01: transfer must not be locked
 */
contract LockableERC20 is LockableTransfer, TokenERC20 {

  /**
   * @dev constructor
   */
  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    address _initialAccount,
    uint256 _initialSupply
  ) TokenERC20(
    _name,
    _symbol,
    _decimals,
    _initialAccount,
    _initialSupply)
  {
  }

  /**
   * @dev transferFromInternal
   */
   function transferFromInternal(address _from, address _to, uint256 _value)
    internal override returns (bool)
  {
    require(!isTransferLocked(_from, _to), "LE01");
    return super.transferFromInternal(_from, _to, _value);
  }
}
