pragma solidity >=0.5.0 <0.6.0;


/**
 * @title IRatesProvider
 * @dev IRatesProvider interface
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */
contract IRatesProvider {

  // ETH is always the base currency
  enum Currency { ETH, BTC, EOS, GBP, USD, CHF, EUR, CNY, JPY, CAD, AUD }
  uint256 constant public CURRENCIES = 11;

  function convertRate(uint256 _rate, uint256 _rateETHDecimal)
    public pure returns (uint256);

  function name() public view returns (string memory);
  function rate(Currency _currency) public view returns (uint256);
  function rates() public view returns (uint256[] memory);
  function updatedAt() public view returns (uint256);
  function rateETH(Currency _currency, uint256 _rateETHDecimal)
    public view returns (uint256);

  function convertToWEI(Currency _currency, uint256 _amountCurrency)
    public view returns (uint256);
  function convertFromWEI(Currency _currency, uint256 _amountWEI)
    public view returns (uint256);
  function convertBetween(Currency _a, Currency _b, uint256 _amountA)
    public view returns (uint256);

  function defineRates(uint256[] memory _rates) public returns (bool);

  event Rate(uint256 at, Currency indexed currency, uint256 rateFromWEI);
}
