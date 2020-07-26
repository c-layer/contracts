pragma solidity ^0.6.0;

import "@c-layer/common/contracts/interface/IERC20.sol";

/**
 * @title DistributionDefinitions
 * @dev DistributionDefinitions interface
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 */
abstract contract IDistributionDefinitions {

  IERC20 constant internal ETHER = IERC20(address(0));

}
