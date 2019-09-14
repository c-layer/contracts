pragma solidity >=0.5.0 <0.6.0;

import "../interface/IRatesProvider.sol";
import "../tokensale/ChangeTokensale.sol";
import "../tokensale/BaseTokensale.sol";


/**
 * @title ChangeTokensaleMock
 * @dev ChangeTokensaleMock contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 */
contract ChangeTokensaleMock is ChangeTokensale {

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
    IRatesProvider _ratesProvider
  ) public
    BaseTokensale(_token, _vaultERC20, _vaultETH, _tokenPrice)
  {
    priceUnit_ = _priceUnit;
    baseCurrency_ = _baseCurrency;
    ratesProvider_ = _ratesProvider;
  }

}
