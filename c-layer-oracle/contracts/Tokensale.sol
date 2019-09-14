pragma solidity >=0.5.0 <0.6.0;

import "./tokensale/BonusTokensale.sol";
import "./tokensale/UserTokensale.sol";
import "./tokensale/ChangeTokensale.sol";


/**
 * @title Tokensale
 * @dev Tokensale contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 */
contract Tokensale is ChangeTokensale, UserTokensale, BonusTokensale {

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
