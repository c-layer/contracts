pragma solidity >=0.5.0 <0.6.0;

import "./KYCTokensale.sol";
import "./ChangeTokensale.sol";
import "./SchedulableTokensale.sol";


/**
 * @title CTokensale
 * @dev CTokensale contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 */
contract CTokensale is ChangeTokensale, KYCTokensale, SchedulableTokensale {

  /**
   * @dev constructor
   */
  constructor(
    IERC20 _token,
    address _vaultERC20,
    address payable _vaultETH,
    uint256 _tokenPrice,
    IUserRegistry _userRegistry,
    IRatesProvider.Currency _baseCurrency,
    IRatesProvider _ratesProvider
  ) public
    Tokensale(_token, _vaultERC20, _vaultETH, _tokenPrice)
    KYCTokensale(_userRegistry)
    ChangeTokensale(_baseCurrency, _ratesProvider)
  {} /* solhint-disable no-empty-blocks */
}
