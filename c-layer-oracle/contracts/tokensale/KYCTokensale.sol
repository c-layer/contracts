pragma solidity >=0.5.0 <0.6.0;

import "./AbstractKYCTokensale.sol";
import "../interface/IUserRegistry.sol";


/**
 * @title KYCTokensale
 * @dev KYCTokensale contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 */
contract KYCTokensale is AbstractKYCTokensale {

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
    Tokensale(_token, _vaultERC20, _vaultETH, _tokenPrice)
  {
    userRegistry_ = _userRegistry;
  }

}
