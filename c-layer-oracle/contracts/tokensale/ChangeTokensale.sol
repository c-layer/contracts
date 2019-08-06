pragma solidity >=0.5.0 <0.6.0;

import "../interface/IRatesProvider.sol";
import "./Tokensale.sol";


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
contract ChangeTokensale is Tokensale {

  bytes32 internal baseCurrency_;
  IRatesProvider internal ratesProvider_;

  /**
   * @dev constructor
   */
  constructor(
    bytes32 _baseCurrency,
    IRatesProvider _ratesProvider
  ) public
  {
    baseCurrency_ = _baseCurrency;
    ratesProvider_ = _ratesProvider;
  }

  /* Investment */
  function investETH() public payable
  {
    require(msg.data.length == 0, "CTS01");
    investInternal(msg.sender, changeInternal(msg.value));
  }

  /**
   * @dev returns baseCurrency
   */
  function baseCurrency() public view returns (bytes32) {
    return baseCurrency_;
  }

  /**
   * @dev returns ratesProvider
   */
  function ratesProvider() public view returns (IRatesProvider) {
    return ratesProvider_;
  }

  /**
   * @dev add offchain investment
   */
  function addOffchainInvestment(address _investor, uint256 _amount)
    public onlyOperator returns (bool)
  {
    require(_amount > 0, "CTS02");
    investInternal(_investor, _amount);
    return true;
  }

  /**
   * @dev change internal
   */
  function changeInternal(uint256 _amountETH) internal view returns (uint256) {
    require(ratesProvider_.rate(baseCurrency_) != 0, "CTS03");
    return (_amountETH > 0) ? ratesProvider_.convertFromWEI(baseCurrency_, _amountETH) : 0;
  }

  /**
   * @dev update unspent ETH
   */
  function updateUnspentETHInternal(Investor storage _investor, uint256 _unspent) internal {
    super.updateUnspentETHInternal(_investor, changeInternal(_unspent));
  }
}
