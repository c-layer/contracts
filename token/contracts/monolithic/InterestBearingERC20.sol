pragma solidity ^0.6.0;

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
 *   IB01: Interest rate must be defined (ie != 0)
 *   IB02: Rates can only be updated when latest rebase have been calculated
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
  ) public ElasticSupplyERC20(_name, _symbol, _decimals, _initialAccount, _initialSupply) {
    interestFrom_ = currentTime();
  }

  function interest() external override view returns (uint256 rate, uint256 from) {
    return (interestRate_, interestFrom_);
  }

  function elasticity() public override view returns (uint256) {
    return elasticityAt(currentTime());
  }

  function elasticityAt(uint256 _at) public override view returns (uint256) {
    if (_at <= interestFrom_) {
      return elasticity_;
    }

    if (interestRate_ > ELASTICITY_PRECISION) {
      return elasticity_.add(elasticity_.mul(interestRate_.sub(ELASTICITY_PRECISION)).mul(_at.sub(interestFrom_)).div(INTEREST_PERIOD).div(ELASTICITY_PRECISION));
    }

    return elasticity_.sub(elasticity_.mul(ELASTICITY_PRECISION.sub(interestRate_)).mul(_at.sub(interestFrom_)).div(INTEREST_PERIOD).div(ELASTICITY_PRECISION));
  }

  function rebaseInterest() public override returns (bool) {
    uint256 periodCount = (currentTime().sub(interestFrom_)).div(INTEREST_PERIOD);
    if(periodCount == 0 || interestRate_ == ELASTICITY_PRECISION) {
      return true;
    }

    // Ensure that if several periods were missed, the contract never gets stucked
    bool result = (periodCount <= REBASE_AT_ONCE);
    periodCount = (result) ? periodCount : REBASE_AT_ONCE;

    for(uint256 i=0; i < periodCount; i++) {
      elasticity_ = elasticity_.mul(interestRate_).div(ELASTICITY_PRECISION);
      interestFrom_ += INTEREST_PERIOD;
      emit InterestRebase(interestFrom_, elasticity_);
    }
    return result;
  }

  function defineInterest(uint256 _interestRate)
    external override onlyOwner returns (bool)
  {
    require(_interestRate != 0, "IB01");
    uint256 currentTime_ = currentTime();

    // Catch up from previous missing rebase (if needed)
    require(rebaseInterest(), "IB02");
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
