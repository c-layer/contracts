pragma solidity >=0.5.0 <0.6.0;

import "./interface/IRatesProvider.sol";
import "./util/math/SafeMath.sol";
import "./util/governance/Operable.sol";


/**
 * @title RatesProvider
 * @dev RatesProvider interface
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 *
 * Error messages
 *   RP01: No rates exists for the base currency ETH
 */
contract RatesProvider is IRatesProvider, Operable {
  using SafeMath for uint256;

  // WEI are used to maximized storage precision
  // FIAT used cents as their currency unit
  uint256[] internal rates_ = new uint256[](CURRENCIES);

  modifier noETH(Currency _currency) {
    require(_currency != Currency.ETH, "RP01");
    _;
  }

  /**
   * @dev convert rate from ETHCHF to WEICents
   */
  function convertRate(
    uint256 _rate,
    uint256 _rateETHDecimal)
    public pure returns (uint256)
  {
    if (_rate == 0) {
      return 0;
    }

    return uint256(
      10**(_rateETHDecimal.add(18 - 2))
    ).div(_rate);
  }

  /**
   * @dev rate as store for a currency
   */
  function rate(Currency _currency) public view returns (uint256) {
    return rates_[uint256(_currency)];
  }

  /**
   * @dev rate ETH for a currency
   * @param _currency currency against ETH
   * @param _rateETHDecimal number of decimal in the result
   */
  function rateETH(Currency _currency, uint256 _rateETHDecimal)
    public view returns (uint256)
  {
    return convertRate(rates_[uint256(_currency)], _rateETHDecimal);
  }

  /**
   * @dev rate as store for a currency
   */
  function rates() public view returns (uint256[] memory) {
    return rates_;
  }

  /**
   * @dev convert from currency to WEI
   */
  function convertToWEI(Currency _currency, uint256 _amountCurrency)
    public view returns (uint256)
  {
    return _amountCurrency.mul(rates_[uint256(_currency)]);
  }

  /**
   * @dev convert from WEI to currency
   */
  function convertFromWEI(Currency _currency, uint256 _amountWEI)
    public view returns (uint256)
  {
    if (rates_[uint256(_currency)] == 0) {
      return 0;
    }

    return _amountWEI.div(rates_[uint256(_currency)]);
  }

  /**
   * @dev convert between two currency
   */
  function convertBetween(Currency _a, Currency _b, uint256 _amountA)
    public view returns (uint256)
  {
    if (rates_[uint256(_b)] == 0) {
      return 0;
    }

    return _amountA.mul(rates_[uint256(_a)]).div(rates_[uint256(_b)]);
  }
  
  /**
   * @dev define rate
   */
  function defineRate(
    Currency _currency, uint256 _rate)
    public onlyOperator noETH(_currency)
  {
    rates_[uint256(_currency)] = _rate;
    emit Rate(currentTime(), _currency, _rate);
  }

  /**
   * @dev define many rate
   */
  function defineAllRates(uint256[] memory _rates)
    public onlyOperator
  {
    for (uint256 i=0; i < _rates.length; i++) {
      if (_rates[i+1] != 0) {
        rates_[i+1] = _rates[i];
        emit Rate(currentTime(), Currency(i), _rates[i]);
      }
    }
  }

  /**
   * @dev define rate with decimals
   */
  function defineETHRate(
    Currency _currency, uint256 _rateETH, uint256 _rateETHDecimal)
    public onlyOperator noETH(_currency)
  {
    // The rate is inverted to maximize the decimals stored
    defineRate(_currency,
      convertRate(_rateETH, _rateETHDecimal));
  }

  /**
   * @dev current time
   */
  function currentTime() private view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return now;
  }
}
