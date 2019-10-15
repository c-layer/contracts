pragma solidity >=0.5.0 <0.6.0;

import "./SchedulableTokensale.sol";


/**
 * @title BonusTokensale
 * @dev BonusTokensale contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * BT01: BonusUntil must be valid if bonuses exist for first investors
 * BT02: BonusUntil must be valid if bonuses exist for early investors
 */
contract BonusTokensale is SchedulableTokensale {

  enum BonusMode { EARLY, FIRST }

  BonusMode internal bonusMode_;
  uint256 internal bonusUntil_;
  uint256[] internal bonuses_;

  event BonusesDefined(uint256[] bonuses, BonusMode bonusMode, uint256 bonusUntil);

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
  function earlyBonus(uint256 _currentTime) public view returns (uint256) {
    if (bonusMode_ != BonusMode.EARLY || bonuses_.length == 0
      || _currentTime < startAt || _currentTime >= bonusUntil_) {
      return 0;
    }

    uint256 split = (bonusUntil_ - startAt) / bonuses_.length;
    return (split == 0) ? 0 : bonuses_[(_currentTime - startAt) / split];
  }

  /**
   * @dev first bonus
   */
  function firstBonus(uint256 _totalRaised) public view returns (uint256) {
    if (bonusMode_ != BonusMode.FIRST
      || bonuses_.length == 0 || _totalRaised >= bonusUntil_) {
      return 0;
    }

    uint256 split = bonusUntil_ / bonuses_.length;
    return (split == 0) ? 0 : bonuses_[_totalRaised/split];
  }

  /**
   * @dev define bonus
   */
  function defineBonuses(uint256[] memory _bonuses, BonusMode _bonusMode, uint256 _bonusUntil)
    public onlyOperator beforeSaleIsOpened returns (bool)
  {
    require(_bonusMode != BonusMode.FIRST
      || (_bonuses.length > 0 && (_bonusUntil > 0)), "BT01");
    require(_bonusMode != BonusMode.EARLY
      || (_bonuses.length > 0
        && (_bonusUntil > startAt && _bonusUntil <= endAt)), "BT02");

    bonuses_ = _bonuses;
    bonusMode_ = _bonusMode;
    bonusUntil_ = _bonusUntil;

    emit BonusesDefined(_bonuses, _bonusMode, _bonusUntil);
    return true;
  }

  /**
   * @dev current bonus
   */
  function currentBonus() public view returns (uint256) {
    if (bonuses_.length == 0 || bonusUntil_ == 0) {
      return 0;
    }
    return (bonusMode_ == BonusMode.EARLY) ? earlyBonus(currentTime()) : firstBonus(totalRaised_);
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
