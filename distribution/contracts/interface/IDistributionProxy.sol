pragma solidity ^0.6.0;

import "@c-layer/common/contracts/interface/IERC20.sol";
import "@c-layer/common/contracts/core/Proxy.sol";
import "./IDistributionDefinitions.sol";


/**
 * @title IDistributionProxy
 * @dev Distribution proxy interface
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 */
abstract contract IDistributionProxy is IDistributionDefinitions, Proxy {

  receive() external virtual payable;
  function deposit(uint256 _amount) public virtual returns (bool);
  function withdraw(uint256 _amount) public virtual returns (bool);
}
