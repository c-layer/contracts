pragma solidity ^0.8.0;

import "@c-layer/common/contracts/interface/IERC20.sol";


/**
 * @title WrappedETH
 * @dev WrappedETH
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
abstract contract IWrappedETH is IERC20 {

  uint256 public constant ETH_DECIMALS = 18;

  receive() external virtual payable;
  function deposit() public virtual payable returns (bool);
  function depositTo(address _to) public virtual payable returns (bool);

  function withdraw(uint256 _value) public virtual returns (bool);
  function withdrawFrom(address _from, address _to, uint256 _value) public virtual returns (bool);
}
