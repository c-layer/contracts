pragma solidity >=0.5.0 <0.6.0;

import "../tokensale/UserTokensale.sol";
import "../interface/IUserRegistry.sol";
import "../tokensale/BaseTokensale.sol";


/**
 * @title UserTokensaleMock
 * @dev UserTokensaleMock contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
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
    IUserRegistry _userRegistry
  ) public
    BaseTokensale(_token, _vaultERC20, _vaultETH, _tokenPrice)
  {
    userRegistry_ = _userRegistry;
  }

}
