pragma solidity >=0.5.0 <0.6.0;

import "./interface/IRatesProvider.sol";
import "./util/math/SafeMath.sol";
import "./util/governance/Operable.sol";


/**
 * @title RatesProvider
 * @dev RatesProvider interface
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 *   RP01: No rates exists for the base currency ETH
 */
contract RatesProvider is IRatesProvider, Operable {
  using SafeMath for uint256;

  string internal name_;

  // WEI are used to maximized storage precision
  // FIAT used cents as their currency unit
  uint256[] internal rates_ = new uint256[](CURRENCIES-1);
  uint256 internal updatedAt_;

  /*
   * @dev constructor
   */
  constructor(string memory _name) public {
    name_ = _name;
  }

  /*
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
   * @dev name
   */
  function name() public view returns (string memory) {
    return name_;
  }

  /**
   * @dev rate as store for a currency
   */
  function rate(Currency _currency) public view returns (uint256) {
    return rates_[uint256(_currency)-1];
  }

  /**
   * @dev rate ETH for a currency
   * @param _currency currency against ETH
   * @param _rateETHDecimal number of decimal in the result
   */
  function rateETH(Currency _currency, uint256 _rateETHDecimal)
    public view returns (uint256)
  {
    return convertRate(rate(_currency), _rateETHDecimal);
  }

  /**
   * @dev rate as store for a currency
   */
  function rates() public view returns (uint256[] memory) {
    return rates_;
  }

  /**
   * @dev updatedAt
   */
  function updatedAt() public view returns (uint256) {
    return updatedAt_;
  }

  /**
   * @dev convert from currency to WEI
   */
  function convertToWEI(Currency _currency, uint256 _amountCurrency)
    public view returns (uint256)
  {
    return _amountCurrency.mul(rate(_currency));
  }

  /**
   * @dev convert from WEI to currency
   */
  function convertFromWEI(Currency _currency, uint256 _amountWEI)
    public view returns (uint256)
  {
    uint256 rate_ = rate(_currency);
    return (rate_ == 0) ? 0 : _amountWEI.div(rate_);
  }

  /**
   * @dev convert between two currency
   */
  function convertBetween(Currency _a, Currency _b, uint256 _amountA)
    public view returns (uint256)
  {
    uint256 rateB_ = rate(_b);
    return (rateB_ == 0) ? 0 : _amountA.mul(rate(_a)).div(rateB_);
  }
  
  /**
   * @dev define all rates
   */
  function defineRates(uint256[] memory _rates)
    public onlyOperator
  {
    updatedAt_ = currentTime();
    for (uint256 i=0; i < _rates.length; i++) {
      if (rates_[i] != _rates[i]) {
        rates_[i] = _rates[i];
      }

      if (_rates[i] != 0) {
        emit Rate(updatedAt_, Currency(i+1), _rates[i]);
      }
    }
  }

  /**
   * @dev current time
   */
  function currentTime() private view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return now;
  }
}
