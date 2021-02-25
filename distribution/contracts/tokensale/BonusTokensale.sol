pragma solidity ^0.8.0;

import "./SchedulableTokensale.sol";


/**
 * @title BonusTokensale
 * @dev BonusTokensale contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * BT01: There must have the same number of bonuses and bonusUntils
 * BT02: There must be some bonuses
 * BT03: There cannot be too many bonuses
 * BT04: BonusUntils must be declared in a progressive order
 * BT05: There cannot be bonuses with a NONE bonus mode
 **/
contract BonusTokensale is SchedulableTokensale {

  enum BonusMode { NONE, EARLY, FIRST }
  uint256 private constant MAX_BONUSES = 10;

  BonusMode internal bonusMode_ = BonusMode.NONE;
  uint256[] internal bonusUntils_;
  uint256[] internal bonuses_;

  event BonusesDefined(uint256[] bonuses, BonusMode bonusMode, uint256[] bonusUntils);

  /**
   * @dev constructor
   */
  constructor(
    IERC20 _token,
    address _vaultERC20,
    address payable _vaultETH,
    uint256 _tokenPrice,
    uint256 _priceUnit
  ) SchedulableTokensale(_token,
      _vaultERC20, _vaultETH, _tokenPrice, _priceUnit)
  {} /* solhint-disable no-empty-blocks */
  
   /**
   * @dev bonuses
   */
  function bonuses() public view returns (BonusMode, uint256[] memory, uint256[] memory) {
    return (bonusMode_, bonuses_, bonusUntils_);
  }

  /**
   * @dev early bonus
   */
  function earlyBonus(uint256 _currentTime)
    public view returns (uint256 bonus, uint256 remainingAtBonus)
  {
    remainingAtBonus = ~uint256(0);

    if (bonusMode_ == BonusMode.EARLY
      && _currentTime >= startAt && _currentTime <= endAt) {
      for(uint256 i=0; i < bonusUntils_.length; i++) {
        if (_currentTime <= bonusUntils_[i]) {
          bonus = bonuses_[i];
          break;
        }
      }
    }
  }

  /**
   * @dev first bonus
   */
  function firstBonus(uint256 _tokensSold)
    public view returns (uint256 bonus, uint256 remainingAtBonus)
  {
    if (bonusMode_ != BonusMode.FIRST) {
      return (uint256(0), ~uint256(0));
    }

    for(uint256 i=0; i < bonusUntils_.length; i++) {
      if (_tokensSold < bonusUntils_[i]) {
        return (bonuses_[i], bonusUntils_[i]-_tokensSold);
      }
    }

    return (uint256(0), ~uint256(0));
  }

  /**
   * @dev define bonus
   */
  function defineBonuses(
    BonusMode _bonusMode,
    uint256[] memory _bonuses,
    uint256[] memory _bonusUntils)
    public onlyOperator beforeSaleIsOpened returns (bool)
  {
    require(_bonuses.length == _bonusUntils.length, "BT01");

    if (_bonusMode != BonusMode.NONE) {
      require(_bonusUntils.length > 0, "BT02");
      require(_bonusUntils.length < MAX_BONUSES, "BT03");

      uint256 bonusUntil =
        (_bonusMode == BonusMode.EARLY) ? startAt : 0;

      for(uint256 i=0; i < _bonusUntils.length; i++) {
        require(_bonusUntils[i] > bonusUntil, "BT04");
        bonusUntil = _bonusUntils[i];
      }
    } else {
      require(_bonusUntils.length == 0, "BT05");
    }

    bonuses_ = _bonuses;
    bonusMode_ = _bonusMode;
    bonusUntils_ = _bonusUntils;

    emit BonusesDefined(_bonuses, _bonusMode, _bonusUntils);
    return true;
  }

  /**
   * @dev current bonus
   */
  function tokenBonus(uint256 _tokens)
    public view returns (uint256 tokenBonus_)
  {
    uint256 bonus;
    uint256 remainingAtBonus;
    uint256 unprocessed = _tokens;

    do {
      if(bonusMode_ == BonusMode.EARLY) {
        (bonus, remainingAtBonus) = earlyBonus(currentTime());
      }

      if(bonusMode_ == BonusMode.FIRST) {
        (bonus, remainingAtBonus) =
          firstBonus(totalTokensSold_+_tokens-unprocessed);
      }

      uint256 tokensAtCurrentBonus =
        (unprocessed < remainingAtBonus) ? unprocessed : remainingAtBonus;
      tokenBonus_ += bonus * tokensAtCurrentBonus / 100;
      unprocessed -= tokensAtCurrentBonus;
    } while(bonus > 0 && unprocessed > 0 && remainingAtBonus > 0);
  }

  /**
   * @dev eval investment internal
   */
  function evalInvestmentInternal(uint256 _tokens)
    internal override view returns (uint256, uint256)
  {
    (uint256 invested, uint256 tokens) = super.evalInvestmentInternal(_tokens);
    uint256 bonus = tokenBonus(tokens);
    return (invested, tokens + bonus);
  }
}
