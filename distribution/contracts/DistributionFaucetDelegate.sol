pragma solidity ^0.6.0;

import "./interface/IDistributionDelegate.sol";
import "./DistributionStorage.sol";


/**
 * @title DistributionFaucetDelegate contract
 * @dev DistributionFaucetDelegate contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 */
abstract contract DistributionFaucetDelegate is IDistributionDelegate, DistributionStorage {
 
  /**
   * @dev tokensAvailable
   */
  function tokensAvailable(address _distribution, address _investor)
    public view override returns (uint256)
  {
    DistributionData storage distributionData = distributions[_distribution];
    InvestorData storage investorData = investors[_distribution][_investor];

    uint256 amount = distributionData.parameters[DistributionParameter.AMOUNT];
    uint256 period = distributionData.parameters[DistributionParameter.PERIOD];

    uint256 timeDelta = (now - investorData.lastTransferOutAt);

    return (timeDelta < period) ? amount * timeDelta / period : amount;
  }
}
