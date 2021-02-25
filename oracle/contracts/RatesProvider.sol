pragma solidity ^0.8.0;

import "@c-layer/common/contracts/operable/Operable.sol";
import "./interface/IRatesProvider.sol";


/**
 * @title RatesProvider
 * @dev RatesProvider interface
 * @dev The null value for a rate indicates that the rate is undefined
 * @dev It is recommended that smart contracts always check against a null rate
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   RP01: Currencies must match decimals length
 *   RP02: rateOffset cannot be null
 *   RP03: Rates definition must only target configured currencies
 */
contract RatesProvider is IRatesProvider, Operable {

  string internal name_;

  // decimals offset with which rates are stored using the counter currency
  // this must be high enought to cover worse case
  // Can only be set to 1 with ETH or ERC20 which already have 18 decimals
  // To support rates with 4 decimals, it should likely be configured to 10**22 (18-2+4) for GBP, USD or CHF.
  uint256 internal rateOffset_ = 10000;

  // The first currency will be the counter currency
  bytes32[] internal currencies_ =
    [ bytes32("ETH"), "BTC", "EOS", "GBP", "USD", "CHF", "EUR", "CNY", "JPY", "CAD", "AUD" ];
  uint256[] internal decimals_ = [ uint256(18), 8, 4, 2, 2, 2, 2, 2, 2, 2, 2 ];

  mapping(bytes32 => uint256) internal ratesMap;
  uint256[] internal rates_ = new uint256[](currencies_.length-1);
  uint256 internal updatedAt_;

  /*
   * @dev constructor
   */
  constructor(string memory _name) {
    name_ = _name;
    for (uint256 i=0; i < currencies_.length; i++) {
      ratesMap[currencies_[i]] = i;
    }
  }

  /**
   * @dev define all rates
   * @dev The rates should be defined in the base currency (WEI, Satoshi, cents, ...)
   * @dev Rates should also account for rateOffset
   */
  function defineRatesExternal(uint256[] calldata _rates)
    override external onlyOperator returns (bool)
  {
    require(_rates.length < currencies_.length, "RP03");

    // solhint-disable-next-line not-rely-on-time
    updatedAt_ = block.timestamp;
    for (uint256 i=0; i < _rates.length; i++) {
      if (rates_[i] != _rates[i]) {
        rates_[i] = _rates[i];
        emit Rate(currencies_[i+1], _rates[i]);
      }
    }
    return true;
  }

  /**
   * @dev name
   */
  function name() override public view returns (string memory) {
    return name_;
  }

  /**
   * @dev rate for a currency
   */
  function rate(bytes32 _currency) override public view returns (uint256) {
    return ratePrivate(_currency);
  }

  /**
   * @dev currencies
   */
  function currencies() override public view
    returns (bytes32[] memory, uint256[] memory, uint256)
  {
    return (currencies_, decimals_, rateOffset_);
  }

  /**
   * @dev rate as store for a currency
   */
  function rates() override public view returns (uint256, uint256[] memory) {
    return (updatedAt_, rates_);
  }

  /**
   * @dev convert between two currency (base units)
   */
  function convert(uint256 _amount, bytes32 _fromCurrency, bytes32 _toCurrency)
    override public view returns (uint256)
  {
    if (_fromCurrency == _toCurrency) {
      return _amount;
    }

    uint256 rateFrom = (_fromCurrency != currencies_[0]) ?
      ratePrivate(_fromCurrency) : rateOffset_;
    uint256 rateTo = (_toCurrency != currencies_[0]) ?
      ratePrivate(_toCurrency) : rateOffset_;

    return (rateTo != 0) ?
      _amount * rateFrom / rateTo : 0;
  }

  /**
   * @dev define all currencies
   * @dev @param _rateOffset is to be used when the default currency
   * @dev does not have enough decimals for sufficient rate precisions
   */
  function defineCurrencies(
    bytes32[] memory _currencies,
    uint256[] memory _decimals,
    uint256 _rateOffset) override public onlyOperator returns (bool)
  {
    require(_currencies.length == _decimals.length, "RP01");
    require(_rateOffset != 0, "RP02");

    for (uint256 i= _currencies.length; i < currencies_.length; i++) {
      delete ratesMap[currencies_[i]];
      emit Rate(currencies_[i], 0);
    }

    while (rates_.length < _currencies.length) {
      rates_.push(0);
    }
    while (rates_.length >= _currencies.length) {
      rates_.pop();
    }

    bool hasBaseCurrencyChanged = _currencies[0] != currencies_[0];
    for (uint256 i=1; i < _currencies.length; i++) {
      bytes32 currency = _currencies[i];
      if (rateOffset_ != _rateOffset
        || ratesMap[currency] != i
        || hasBaseCurrencyChanged)
      {
        ratesMap[currency] = i;
        rates_[i-1] = 0;

        if (i < currencies_.length) {
          emit Rate(currencies_[i], 0);
        }
      }
    }

    if (rateOffset_ != _rateOffset) {
      emit RateOffset(_rateOffset);
      rateOffset_ = _rateOffset;
    }

    // solhint-disable-next-line not-rely-on-time
    updatedAt_ = block.timestamp;
    currencies_ = _currencies;
    decimals_ = _decimals;

    emit Currencies(_currencies, _decimals);
    return true;
  }
  
  /**
   * @dev define all rates
   * @dev The rates should be defined in the base currency (WEI, Satoshi, cents, ...)
   * @dev Rates should also account for rateOffset
   */
  function defineRates(uint256[] memory _rates)
    override public onlyOperator returns (bool)
  {
    require(_rates.length < currencies_.length, "RP03");

    // solhint-disable-next-line not-rely-on-time
    updatedAt_ = block.timestamp;
    for (uint256 i=0; i < _rates.length; i++) {
      if (rates_[i] != _rates[i]) {
        rates_[i] = _rates[i];
        emit Rate(currencies_[i+1], _rates[i]);
      }
    }
    return true;
  }

  /**
   * @dev rate for a currency
   */
  function ratePrivate(bytes32 _currency) private view returns (uint256) {
    if (_currency == currencies_[0]) {
      return 1;
    }

    uint256 id = ratesMap[_currency];
    return (id > 0) ? rates_[id-1] : 0;
  }
}
