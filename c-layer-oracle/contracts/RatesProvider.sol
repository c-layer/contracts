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
 *   RP01: No rate exist against ETH
 *   RP02: Rates definition must only target configured currencies
 */
contract RatesProvider is IRatesProvider, Operable {
  using SafeMath for uint256;

  bytes32 internal constant ETH = "0x455448";
  uint256 internal constant ETH_DECIMALS = 18;

  string internal name_;

  // [ BTC, EOS, GBP, USD, CHF, EUR, CNY, JPY, CAD, AUD ]
  bytes32[] internal currencies_ =
    [ bytes32("BTC"), "EOS", "GBP", "USD", "CHF", "EUR", "CNY", "JPY", "CAD", "AUD" ];
  mapping(bytes32 => uint256) internal currenciesMap;
  uint256[] internal decimals_ = [ uint256(9), 4, 2, 2, 2, 2, 2, 2, 2, 2 ];

  // WEI are used to maximized storage precision
  // FIAT used cents as their currency unit
  uint256[] internal rates_ = new uint256[](currencies_.length);
  uint256 internal updatedAt_;

  /*
   * @dev constructor
   */
  constructor(string memory _name) public {
    name_ = _name;
    for (uint256 i=0; i < currencies_.length; i++) {
      currenciesMap[currencies_[i]] = i;
    }
  }

  /**
   * @dev name
   */
  function name() public view returns (string memory) {
    return name_;
  }

  /**
   * @dev rate for a currency
   */
  function rate(bytes32 _currency) public view returns (uint256) {
    require(_currency != ETH, "RP01");
    uint256 id = currenciesMap[_currency];
    return rates_[id];
  }

  /**
   * @dev currencies
   */
  function currencies() public view returns (bytes32[] memory) {
    return currencies_;
  }

  /**
   * @dev decimals
   */
  function decimals() public view returns (uint256[] memory) {
    return decimals_;
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
   * @dev rate ETH for a currency
   * @param _currency currency against ETH
   * @param _rateETHDecimal number of decimal in the result
   */
  function rateETH(bytes32 _currency, uint256 _rateETHDecimal)
    public view returns (uint256)
  {
    return convertRate(rate(_currency), _currency, _rateETHDecimal);
  }

  /*
   * @dev convert rate from ETHXXX to WEIBaseXXX
   */
  function convertRate(
    uint256 _rate,
    bytes32 _currency,
    uint256 _rateETHDecimal)
    public view returns (uint256)
  {
    if (_rate == 0) {
      return 0;
    }

    uint256 id = currenciesMap[_currency];
    return uint256(
      10**(_rateETHDecimal.add(ETH_DECIMALS - decimals_[id]))
    ).div(_rate);
  }

  /**
   * @dev convert from currency to WEI
   */
  function convertToWEI(bytes32 _currency, uint256 _amountCurrency)
    public view returns (uint256)
  {
    if (_currency == ETH) {
      return _amountCurrency;
    }

    uint256 currencyRate = rate(_currency);
    return (currencyRate == 0) ?
      0 : _amountCurrency.mul(currencyRate);
  }

  /**
   * @dev convert from WEI to currency
   */
  function convertFromWEI(bytes32 _currency, uint256 _amountWEI)
    public view returns (uint256)
  {
    if (_currency == ETH) {
      return _amountWEI;
    }

    uint256 currencyRate = rate(_currency);
    return (currencyRate == 0) ?
      0 : _amountWEI.div(currencyRate);
  }

  /**
   * @dev convert between two currency
   */
  function convertBetween(bytes32 _currencyA, bytes32 _currencyB, uint256 _amountA)
    public view returns (uint256)
  {
    if (_currencyA == _currencyB) {
      return _amountA;
    }

    uint256 currencyRateA = rate(_currencyA);
    uint256 currencyRateB = rate(_currencyB);
    return (currencyRateA == 0 || currencyRateB == 0) ?
      0 : _amountA.mul(currencyRateA).div(currencyRateB);
  }

  /**
   * @dev define all currencies
   */
  function defineCurrencies(
    bytes32[] memory _currencies, uint256[] memory _decimals)
    public onlyOperator returns (bool)
  {
    updatedAt_ = 0;

    for (uint256 i=_currencies.length; i < currencies_.length; i++) {
      delete currenciesMap[currencies_[i]];
    }
    rates_.length = _currencies.length;

    for (uint256 i=0; i < _currencies.length; i++) {
      bytes32 currency = _currencies[i];
      if (currenciesMap[currency] != i) {
        currenciesMap[currency] = i;
        rates_[i] = 0;
      }
    }

    currencies_ = _currencies;
    decimals_ = _decimals;
    return true;
  }
  
  /**
   * @dev define all rates
   */
  function defineRates(uint256[] memory _rates)
    public onlyOperator returns (bool)
  {
    require(_rates.length <= currencies_.length, "RP02");

    updatedAt_ = currentTime();
    for (uint256 i=0; i < _rates.length; i++) {
      if (rates_[i] != _rates[i]) {
        rates_[i] = _rates[i];
      }

      if (_rates[i] != 0) {
        emit Rate(updatedAt_, currencies_[i], _rates[i]);
      }
    }
    return true;
  }

  /**
   * @dev current time
   */
  function currentTime() private view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return now;
  }
}
