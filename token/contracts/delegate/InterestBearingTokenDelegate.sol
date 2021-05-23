pragma solidity ^0.8.0;

import "./ElasticSupplyTokenDelegate.sol";


/**
 * @title InterestBearingTokenDelegate
 * @dev InterestBearingTokenDelegate contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   IB01: Unable to predict elasticity in the past
 *   IB02: Interest rate must be defined (ie != 0)
 *   IB03: Rates can only be updated when latest rebase have been calculated
*/
contract InterestBearingTokenDelegate is ElasticSupplyTokenDelegate {

  uint256 internal constant REBASE_AT_ONCE = 10;
  uint256 internal constant INTEREST_PERIOD = 31557600; // 365.25 * 24 * 3600 seconds a year;

  function elasticity(address _token) public override view returns (uint256) {
    return elasticityAt(_token, currentTime());
  }

  /**
   * @dev elasticityAt
   * @dev evaluate the increase of elasticity within the current interest period
   **/
  function elasticityAt(address _token, uint256 _at) public view returns (uint256) {
    TokenData storage token = tokens[_token];
    if (token.interestFrom == 0) {
      return ELASTICITY_PRECISION;
    }

    require(_at >= token.interestFrom && _at <= token.interestFrom + INTEREST_PERIOD, "IB01");

    if (token.interestRate > ELASTICITY_PRECISION) {
      return token.elasticity + (
        token.elasticity * (_at - token.interestFrom) * (token.interestRate - ELASTICITY_PRECISION)
      ) / INTEREST_PERIOD / ELASTICITY_PRECISION;
    } else {
      return token.elasticity - (
        token.elasticity * (_at - token.interestFrom) * (ELASTICITY_PRECISION - token.interestRate)
      ) / INTEREST_PERIOD / ELASTICITY_PRECISION;
    }
  }

  function rebaseInterest(address _token) public returns (bool) {
    TokenData storage token = tokens[_token];
    uint256 periodCount = (currentTime() - token.interestFrom) / INTEREST_PERIOD;
    if(token.interestFrom == 0 || periodCount == 0 || token.interestRate == ELASTICITY_PRECISION) {
      return true;
    }

    // Ensure that if several periods were missed, the contract never gets stucked
    bool result = (periodCount <= REBASE_AT_ONCE);
    periodCount = (result) ? periodCount : REBASE_AT_ONCE;

    for(uint256 i=0; i < periodCount; i++) {
      token.elasticity = token.elasticity * token.interestRate / ELASTICITY_PRECISION;
      token.interestFrom += INTEREST_PERIOD;
      emit InterestRebased(_token, token.interestFrom, token.elasticity);
    }
    return result;
  }

  function defineInterest(address _token, uint256 _interestRate)
    external returns (bool)
  {
    require(_interestRate != 0, "IB02");
    uint256 currentTime_ = currentTime();

    // Catch up from previous missing rebase (if needed)
    require(rebaseInterest(_token), "IB03");
    uint256 latestElasticity = elasticityAt(_token, currentTime_);
    TokenData storage token = tokens[_token];
    if (latestElasticity != token.elasticity) {
      // Update with the remaining interest of the current period
      token.elasticity = latestElasticity;
      if (token.interestFrom > 0) {
        emit InterestRebased(_token, currentTime_, token.elasticity);
      }
    }

    // Define the new interest
    token.interestRate = _interestRate;
    token.interestFrom = currentTime_;
    emit InterestUpdated(_token, token.interestRate, token.elasticity);
    return true;
  }

 /**
   * @dev transfer
   */
  function transferInternal(STransferData memory _transferData)
    override virtual internal returns (bool)
  {
    rebaseInterest(_transferData.token);
    return super.transferInternal(_transferData);
  }
}
