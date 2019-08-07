pragma solidity >=0.5.0 <0.6.0;

import "../interface/IRatesProvider.sol";
import "./AbstractChangeTokensale.sol";


/**
 * @title ChangeTokensale
 * @dev ChangeTokensale contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 * CTS01: No data must be sent while sending ETH
 * CTS02: Offchain amount must be positive
 * CTS03: A rates must be defined
 */
contract ChangeTokensale is AbstractChangeTokensale {

  /**
   * @dev constructor
   */
  constructor(
    IERC20 _token,
    address _vaultERC20,
    address payable _vaultETH,
    uint256 _tokenPrice,
    bytes32 _baseCurrency,
    IRatesProvider _ratesProvider
  ) public
    Tokensale(_token, _vaultERC20, _vaultETH, _tokenPrice)
  {
    baseCurrency_ = _baseCurrency;
    ratesProvider_ = _ratesProvider;
  }

}
