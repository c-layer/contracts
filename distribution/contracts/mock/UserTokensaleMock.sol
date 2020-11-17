pragma solidity ^0.6.0;

import "../tokensale/UserTokensale.sol";


/**
 * @title UserTokensaleMock
 * @dev UserTokensaleMock contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract UserTokensaleMock is UserTokensale {

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
    IRatesProvider _ratesProvider,
    IUserRegistry _userRegistry
  ) public
    UserTokensale(_token, _vaultERC20, _vaultETH, _tokenPrice, _priceUnit)
  {
    userRegistry_ = _userRegistry;
    baseCurrency_ = _baseCurrency;
    ratesProvider_ = _ratesProvider;
  }

}
