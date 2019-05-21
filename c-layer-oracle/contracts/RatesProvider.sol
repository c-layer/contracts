pragma solidity >=0.5.0 <0.6.0;

import "./interface/IRatesProvider.sol";
import "./util/math/SafeMath.sol";
import "./util/governance/Operator.sol";


/**
 * @title RatesProvider
 * @dev RatesProvider interface
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 *
 * Error messages
 */
contract RatesProvider is IRatesProvider, Operator {
  using SafeMath for uint256;

  // WEICHF rate is in ETH_wei/CHF_cents with no fractional parts
  uint256 internal rateWEIPerCHFCent_;

  /**
   * @dev constructor
   */
  constructor() public {
  }

  /**
   * @dev convert rate from ETHCHF to WEICents
   */
  function convertRateFromETHCHF(
    uint256 _rateETHCHF,
    uint256 _rateETHCHFDecimal)
    public pure returns (uint256)
  {
    if (_rateETHCHF == 0) {
      return 0;
    }

    return uint256(
      10**(_rateETHCHFDecimal.add(18 - 2))
    ).div(_rateETHCHF);
  }

  /**
   * @dev convert rate from WEICents to ETHCHF
   */
  function convertRateToETHCHF(
    uint256 _rateWEIPerCHFCent,
    uint256 _rateETHCHFDecimal)
    public pure returns (uint256)
  {
    if (_rateWEIPerCHFCent == 0) {
      return 0;
    }

    return uint256(
      10**(_rateETHCHFDecimal.add(18 - 2))
    ).div(_rateWEIPerCHFCent);
  }

  /**
   * @dev convert CHF to ETH
   */
  function convertCHFCentToWEI(uint256 _amountCHFCent)
    public view returns (uint256)
  {
    return _amountCHFCent.mul(rateWEIPerCHFCent_);
  }

  /**
   * @dev convert ETH to CHF
   */
  function convertWEIToCHFCent(uint256 _amountETH)
    public view returns (uint256)
  {
    if (rateWEIPerCHFCent_ == 0) {
      return 0;
    }

    return _amountETH.div(rateWEIPerCHFCent_);
  }

  /* Current ETHCHF rates */
  function rateWEIPerCHFCent() public view returns (uint256) {
    return rateWEIPerCHFCent_;
  }
  
  /**
   * @dev rate ETHCHF
   */
  function rateETHCHF(uint256 _rateETHCHFDecimal)
    public view returns (uint256)
  {
    return convertRateToETHCHF(rateWEIPerCHFCent_, _rateETHCHFDecimal);
  }

  /**
   * @dev define rate
   */
  function defineRate(uint256 _rateWEIPerCHFCent)
    public onlyOperator
  {
    rateWEIPerCHFCent_ = _rateWEIPerCHFCent;
    emit Rate(currentTime(), _rateWEIPerCHFCent);
  }

  /**
   * @dev define rate with decimals
   */
  function defineETHCHFRate(uint256 _rateETHCHF, uint256 _rateETHCHFDecimal)
    public onlyOperator
  {
    // The rate is inverted to maximize the decimals stored
    defineRate(convertRateFromETHCHF(_rateETHCHF, _rateETHCHFDecimal));
  }

  /**
   * @dev current time
   */
  function currentTime() private view returns (uint256) {
    // solium-disable-next-line security/no-block-members
    return now;
  }

  event Rate(uint256 at, uint256 rateWEIPerCHFCent);
}
