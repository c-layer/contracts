pragma solidity >=0.5.0 <0.6.0;

import "./SchedulableTokensale.sol";


/**
 * @title BonusTokensale
 * @dev BonusTokensale contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * BT01: BonusUntil must be defined if bonuses exist
 * BT02: BonusUntil must be within the sale
 */
contract BonusTokensale is SchedulableTokensale {

  enum BonusMode { EARLY, FIRST }

  BonusMode internal bonusMode_;
  uint256 internal bonusUntil_;
  uint256[] internal bonuses_;

  /**
   * @dev constructor
   */
  constructor(
    IERC20 _token,
    address _vaultERC20,
    address payable _vaultETH,
    uint256 _tokenPrice
  ) public
    SchedulableTokensale(_token, _vaultERC20, _vaultETH, _tokenPrice)
  {} /* solhint-disable no-empty-blocks */
  
  /**
   * @dev bonusMode
   */
  function bonusMode() public view returns (BonusMode) {
    return bonusMode_;
  }

  /**
   * @dev bonusUntil
   */
  function bonusUntil() public view returns (uint256) {
    return bonusUntil_;
  }

   /**
   * @dev bonuses
   */
  function bonuses() public view returns (uint256[] memory) {
    return bonuses_;
  }

  /**
   * @dev early bonus
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
  function defineBonus(uint256[] memory _bonuses, BonusMode _bonusMode, uint256 _bonusUntil)
    public onlyOperator beforeSaleIsOpened returns (uint256)
  {
    require(_bonuses.length == 0 || _bonusUntil != 0, "BT01");
    require(_bonusUntil >= startAt || _bonusUntil <= endAt, "BT02");

    bonuses_ = _bonuses;
    bonusMode_ = _bonusMode;
    bonusUntil_ = _bonusUntil;
  }

  /**
   * @dev current bonus
   */
  function currentBonus() public view returns (uint256) {
    if (bonuses_.length == 0 || bonusUntil_ == 0) {
      return 0;
    }
    return (bonusMode_ == BonusMode.EARLY) ? earlyBonus() : firstBonus();
  }

  /**
   * @dev eval investment internal
   */
  function evalInvestmentInternal(uint256 _tokens)
    internal view returns (uint256, uint256)
  {
    (uint256 invested, uint256 tokens) = super.evalInvestmentInternal(_tokens);
    uint256 bonus = tokenBonusInternal(tokens);
    return (invested, tokens.add(bonus));
  }

  /**
   * @dev tokenBonus
   */
  function tokenBonusInternal(uint256 _tokens)
    internal view returns (uint256)
  {
    return currentBonus().mul(_tokens).div(100);
  }
}
