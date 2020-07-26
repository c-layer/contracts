pragma solidity ^0.6.0;

import "@c-layer/common/contracts/interface/IERC20.sol";
import "./IDistributionDefinitions.sol";
import "./IVault.sol";


/**
 * @title DistributionStorage
 * @dev DistributionStorage interface
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 */
abstract contract IDistributionStorage is IDistributionDefinitions {

  enum DistributionParameter {
    
    // Faucet
    TOTAL_AMOUNT,
    PERIOD,
    AMOUNT


    //MINIMAL_AMOUNT,
    //OPEN_AT,
    //CLOSED_AT,
    //VALUE_AT,
    //PRICE,
    //PRICE_UNIT,
    //BONUS_RATIO,
    //VESTING_RATIO,
    //STEP_EVAL_MODE,
    //STEP_UNTIL,
    //MIN_INVESTMENT,
    //MAX_INVESTMENT
  }

  event DistributionDelegateDefined(uint256 delegateId, address delegate);
  event DistributionDelegateRemoved(uint256 delegateId);
  event DistributionDefined(
    address distribution,
    uint256 delegateId,
    IVault vault,
    IERC20 token);
  event DistributionRemoved(address _distribution);

  event Deposit(IERC20 token, uint256 amount);
  event Withdraw(IERC20 token, uint256 amount);
}
