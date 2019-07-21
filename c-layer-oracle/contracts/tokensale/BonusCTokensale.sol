pragma solidity >=0.5.0 <0.6.0;

import "./BonusTokensale.sol";
import "./CTokensale.sol";


/**
 * @title BonusCTokensale
 * @dev BonusCTokensale contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 */
contract BonusCTokensale is BonusTokensale, CTokensale {

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
    CTokensale(_token, _vaultERC20, _vaultETH, _tokenPrice, _userRegistry, _baseCurrency, _ratesProvider)
  {} /* solhint-disable no-empty-blocks */
}
