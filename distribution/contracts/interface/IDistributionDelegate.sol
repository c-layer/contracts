pragma solidity ^0.6.0;

import "./IDistributionStorage.sol";
import "./IDistributionCore.sol";


/**
 * @title DistributionDelegate interface
 * @dev DistributionDelegate interface
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 */
abstract contract IDistributionDelegate is IDistributionStorage {
  
  function tokensAvailable(address _distribution, address _investor)
    public view virtual returns (uint256); 
}
