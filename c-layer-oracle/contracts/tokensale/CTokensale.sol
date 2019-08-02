pragma solidity >=0.5.0 <0.6.0;

import "./BonusTokensale.sol";
import "./KYCTokensale.sol";
import "./ChangeTokensale.sol";


/**
 * @title CTokensale
 * @dev CTokensale contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 */
contract CTokensale is ChangeTokensale, KYCTokensale, BonusTokensale {

  /**
   * @dev constructor
   */
  constructor(
    IERC20 _token,
    address _vaultERC20,
    address payable _vaultETH,
    uint256 _tokenPrice,
    IRatesProvider.Currency _baseCurrency,
    IUserRegistry _userRegistry,
    IRatesProvider _ratesProvider,
    uint256 _start,
    uint256 _end,
    uint256[] memory _bonuses,
    uint256 _bonusUntil
  ) public
    Tokensale(_token, _vaultERC20, _vaultETH, _tokenPrice)
    KYCTokensale(_userRegistry)
    ChangeTokensale(_baseCurrency, _ratesProvider)
  {
    updateSchedule(_start, _end);
    defineBonus(_bonuses, BonusMode.EARLY, _bonusUntil);
  }
}
