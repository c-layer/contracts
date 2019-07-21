pragma solidity >=0.5.0 <0.6.0;

import "./SchedulableTokensale.sol";


/**
 * @title BonusTokensale
 * @dev BonusTokensale contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 */
contract BonusTokensale is SchedulableTokensale {

  enum BonusMode { EARLY, FIRST }

  BonusMode internal mode_;
  uint256 internal bonusUntil_;
  uint256[] internal bonuses_;
  
  /**
   * @dev earlyBonus;
   */
  function earlyBonus() public view returns (uint256) {
    if (bonuses_.length != 0) {
      uint256 split = (bonusUntil_ - startAt) / bonuses_.length;
      uint256 id = (currentTime() - startAt) / split;
      return bonuses_[id];
    }
    return 0;
  }

  /**
   * @dev first bonus
   */
  function firstBonus() public view returns (uint256) {
    if (bonuses_.length != 0) {
      uint256 split = bonusUntil_ / bonuses_.length;
      uint256 id = totalRaised_ / split;
      return bonuses_[id];
    }
    return 0;
  }

  /**
   * @dev define bonus
   */
  function defineBonus(uint256[] memory _bonuses, BonusMode _mode, uint256 _bonusUntil)
    public onlyOperator beforeSaleIsOpened returns (uint256)
  {
    require(_bonuses.length == 0 || _bonusUntil != 0, "");

    bonuses_ = _bonuses;
    mode_ = _mode;
    bonusUntil_ = _bonusUntil;
  }

  /**
   * @dev current bonus
   */
  function currentBonus() public view returns (uint256) {
    if (bonuses_.length == 0 || bonusUntil_ == 0) {
      return 0;
    }
    return (mode_ == BonusMode.EARLY) ? earlyBonus() : firstBonus();
  }

  /**
   * @dev tokenInvestment
   */
  function tokenInvestment(address _investor, uint256 _amount)
    public view returns (uint256)
  {
    uint256 tokens = super.tokenInvestment(_investor, _amount);
    return (currentBonus().add(100)).mul(tokens).div(100);
  }
}
