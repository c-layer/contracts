pragma solidity >=0.5.0 <0.6.0;

import "../interface/IRatesProvider.sol";
import "./BaseTokensale.sol";


/**
 * @title ChangeTokensale
 * @dev ChangeTokensale contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * CTS01: message value must be positive
 * CTS02: A rate must be correctly defined
 */
contract ChangeTokensale is BaseTokensale {

  bytes32 internal baseCurrency_;
  IRatesProvider internal ratesProvider_;

  uint256 internal totalReceivedETH_;

  /* Investment */
  function investETH() public payable
  {
    require(msg.value > 0, "CTS01");
    totalReceivedETH_ = totalReceivedETH_.add(msg.value);

    Investor storage investor = investorInternal(msg.sender);
    uint256 amountETH = investor.unspentETH.add(msg.value);
    uint256 amountCurrency =
      ratesProvider_.convert(amountETH, "ETH", baseCurrency_);
    require(amountCurrency > 0, "CTS02");

    investInternal(msg.sender, amountCurrency, true);
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
   * @dev returns totalRaisedETH
   */
  function totalRaisedETH() public view returns (uint256) {
    return totalReceivedETH_.sub(totalUnspentETH_).sub(totalRefundedETH_);
  }

  /**
   * @dev returns totalReceivedETH
   */
  function totalReceivedETH() public view returns (uint256) {
    return totalReceivedETH_;
  }

  /**
   * @dev add offchain investment
   */
  function addOffchainInvestment(address _investor, uint256 _amount)
    public onlyOperator returns (bool)
  {
    investInternal(_investor, _amount, false);

    return true;
  }

  /**
   * @dev eval unspent ETH
   */
  function evalUnspentETHInternal(
    Investor storage _investor, uint256 _invested
  ) internal view returns (uint256)
  {
    uint256 investedETH =
      ratesProvider_.convert(_invested, baseCurrency_, "ETH");
    return super.evalUnspentETHInternal(_investor, investedETH);
  }
}
