pragma solidity ^0.6.0;

import "../tokensale/ChangeTokensale.sol";


/**
 * @title ChangeTokensaleMock
 * @dev ChangeTokensaleMock contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
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
    ChangeTokensale(_token, _vaultERC20, _vaultETH, _tokenPrice, _priceUnit)
  {
    baseCurrency_ = _baseCurrency;
    ratesProvider_ = _ratesProvider;
  }

}
