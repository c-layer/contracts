pragma solidity ^0.8.0;

import "../interface/IInterestBearingERC20.sol";
import "./ElasticSupplyERC20.sol";


/**
 * @title InterestBearingERC20
 * @dev Interest Bearing ERC20 token
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   IB01: Unable to predict elasticity in the past
 *   IB02: Interest rate must be defined (ie != 0)
 *   IB03: Rates can only be updated when latest rebase have been calculated
 */
contract InterestBearingERC20 is IInterestBearingERC20, ElasticSupplyERC20 {

  uint256 internal interestRate_ = ELASTICITY_PRECISION;
  uint256 internal interestFrom_;

  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    address _initialAccount,
    uint256 _initialSupply
  ) ElasticSupplyERC20(_name, _symbol, _decimals, _initialAccount, _initialSupply) {
    interestFrom_ = currentTime();
  }

  function interest() external override view returns (uint256 rate, uint256 from) {
    return (interestRate_, interestFrom_);
  }

  function elasticity() public override view returns (uint256) {
    return elasticityAt(currentTime());
  }

  /**
   * @dev elasticityAt
   * @dev evaluate the increase of elasticity within the current interest period
   **/
  function elasticityAt(uint256 _at) public override view returns (uint256) {
    require(_at >= interestFrom_ && _at <= interestFrom_ + INTEREST_PERIOD, "IB01");

    if (interestRate_ > ELASTICITY_PRECISION) {
      return elasticity_ + (
        elasticity_ * (_at - interestFrom_) * (interestRate_ - ELASTICITY_PRECISION)
      ) / INTEREST_PERIOD / ELASTICITY_PRECISION;
    } else {
      return elasticity_ - (
        elasticity_ * (_at - interestFrom_) * (ELASTICITY_PRECISION - interestRate_)
      ) / INTEREST_PERIOD / ELASTICITY_PRECISION;
    }
  }

  function rebaseInterest() public override returns (bool) {
    uint256 periodCount = (currentTime() - interestFrom_) / INTEREST_PERIOD;
    if(periodCount == 0 || interestRate_ == ELASTICITY_PRECISION) {
      return true;
    }

    // Ensure that if several periods were missed, the contract never gets stucked
    bool result = (periodCount <= REBASE_AT_ONCE);
    periodCount = (result) ? periodCount : REBASE_AT_ONCE;

    for(uint256 i=0; i < periodCount; i++) {
      elasticity_ = elasticity_ * interestRate_ / ELASTICITY_PRECISION;
      interestFrom_ += INTEREST_PERIOD;
      emit InterestRebase(interestFrom_, elasticity_);
    }
    return result;
  }

  function defineInterest(uint256 _interestRate)
    external override onlyOwner returns (bool)
  {
    require(_interestRate != 0, "IB02");
    uint256 currentTime_ = currentTime();

    // Catch up from previous missing rebase (if needed)
    require(rebaseInterest(), "IB03");
    uint256 latestElasticity = elasticityAt(currentTime_);
    if (latestElasticity != elasticity_) {
      // Update with the remaining interest of the current period
      elasticity_ = elasticityAt(currentTime_);
      emit InterestRebase(currentTime_, elasticity_);
    }

    // Define the new interest
    interestRate_ = _interestRate;
    interestFrom_ = currentTime_;
    emit InterestUpdate(interestRate_, elasticity_);
    return true;
  }

  function transferFromInternal(address _from, address _to, uint256 _value)
    internal override virtual returns (bool)
  {
    rebaseInterest();
    return super.transferFromInternal(_from, _to, _value);
  }

  /**
   * @dev currentTime()
   */
  function currentTime() internal virtual view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return block.timestamp;
  }
}
