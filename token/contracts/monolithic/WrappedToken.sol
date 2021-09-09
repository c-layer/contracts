pragma solidity ^0.8.0;

import "@c-layer/distribution/contracts/WrappedERC20.sol";
import "./LockableTransfer.sol";
import "./Distributable.sol";


/**
 * @title WrappedToken
 * @dev WrappedToken contract
 * Wrapped token ERC20 default implementation
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * WT01: transfer must be successfull
 */
contract WrappedToken is LockableTransfer, Distributable, WrappedERC20 {

  /**
   * @dev constructor
   */
  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    IERC20 _base
  ) WrappedERC20(_name, _symbol, _decimals, _base) {
  }

  /**
   * @dev transferFromInternal
   */
   function transferFromInternal(address _from, address _to, uint256 _value)
    internal override returns (bool)
  {
    require(!isTransferLocked(_from, _to), "WT01");
    return super.transferFromInternal(_from, _to, _value);
  }
}
