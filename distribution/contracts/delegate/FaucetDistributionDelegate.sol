pragma solidity ^0.6.0;

import "../interface/IDistributionDelegate.sol";
import "../DistributionStorage.sol";


/**
 * @title FaucetDistributionDelegate contract
 * @dev FaucetDistributionDelegate contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 */
contract FaucetDistributionDelegate is IDistributionDelegate, DistributionStorage {
 
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

    // solhint-disable-next-line not-rely-on-time
    uint256 timeDelta = (now - investorData.lastTransferOutAt);

    return (timeDelta < period) ? amount * timeDelta / period : amount;
  }
}
