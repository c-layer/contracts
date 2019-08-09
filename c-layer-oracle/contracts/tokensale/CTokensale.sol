pragma solidity >=0.5.0 <0.6.0;

import "./BonusTokensale.sol";
import "./AbstractKYCTokensale.sol";
import "./AbstractChangeTokensale.sol";


/**
 * @title CTokensale
 * @dev CTokensale contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 */
contract CTokensale is AbstractChangeTokensale, AbstractKYCTokensale, BonusTokensale {

  /**
   * @dev constructor
   */
  constructor(
    IERC20 _token,
    address _vaultERC20,
    address payable _vaultETH,
    uint256 _tokenPrice,
    uint256 _priceUnit,
    bytes32 _baseCurrency,
    IUserRegistry _userRegistry,
    IRatesProvider _ratesProvider,
    uint256 _start,
    uint256 _end,
    uint256[] memory _bonuses,
    uint256 _bonusUntil
  ) public
    BonusTokensale(_token, _vaultERC20, _vaultETH, _tokenPrice)
  {
    priceUnit_ = _priceUnit;
    baseCurrency_ = _baseCurrency;
    userRegistry_ = _userRegistry;
    ratesProvider_ = _ratesProvider;

    updateSchedule(_start, _end);
    defineBonus(_bonuses, BonusMode.EARLY, _bonusUntil);
  }
}
