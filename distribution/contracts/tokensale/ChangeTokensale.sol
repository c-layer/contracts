pragma solidity ^0.6.0;

import "@c-layer/oracle/contracts/interface/IRatesProvider.sol";
import "./BonusTokensale.sol";


/**
 * @title ChangeTokensale
 * @dev ChangeTokensale contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * CTS01: message value must be positive
 * CTS02: No investment after currency change.
 */
contract ChangeTokensale is BonusTokensale {

  bytes32 internal baseCurrency_;
  IRatesProvider internal ratesProvider_;

  uint256 internal totalReceivedETH_;

  /**
   * @dev constructor
   */
  constructor(
    IERC20 _token,
    address _vaultERC20,
    address payable _vaultETH,
    uint256 _tokenPrice,
    uint256 _priceUnit
  ) public BonusTokensale(_token, _vaultERC20, _vaultETH, _tokenPrice, _priceUnit)
  {}

  /* Investment */
  function investETH() override public payable
  {
    require(msg.value > 0, "CTS01");
    totalReceivedETH_ = totalReceivedETH_.add(msg.value);

    Investor storage investor = investorInternal(msg.sender);
    uint256 amountETH = investor.unspentETH.add(msg.value);
    uint256 amountCurrency =
      ratesProvider_.convert(amountETH, "ETH", baseCurrency_);
    require(amountCurrency > 0, "CTS02");

    investInternal(msg.sender, amountCurrency, false);
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
    investInternal(_investor, _amount, true);

    return true;
  }

  /**
   * @dev eval unspent ETH
   */
  function evalUnspentETHInternal(
    Investor storage _investor, uint256 _invested
  ) internal override view returns (uint256)
  {
    uint256 investedETH =
      ratesProvider_.convert(_invested, baseCurrency_, "ETH");
    return super.evalUnspentETHInternal(_investor, investedETH);
  }
}
