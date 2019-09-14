pragma solidity >=0.5.0 <0.6.0;


/**
 * @title IRatesProvider
 * @dev IRatesProvider interface
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract IRatesProvider {

  function defineRatesExternal(uint256[] calldata _rates) external returns (bool);

  function name() public view returns (string memory);

  function rate(bytes32 _currency) public view returns (uint256);

  function currencies() public view
    returns (bytes32[] memory, uint256[] memory, uint256);
  function rates() public view returns (uint256, uint256[] memory);

  function convert(uint256 _amount, bytes32 _fromCurrency, bytes32 _toCurrency)
    public view returns (uint256);

  function defineCurrencies(
    bytes32[] memory _currencies,
    uint256[] memory _decimals,
    uint256 _rateOffset) public returns (bool);
  function defineRates(uint256[] memory _rates) public returns (bool);

  event RateOffset(uint256 rateOffset);
  event Currencies(bytes32[] currencies, uint256[] decimals);
  event Rate(uint256 at, bytes32 indexed currency, uint256 rate);
}
