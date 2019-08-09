pragma solidity >=0.5.0 <0.6.0;


/**
 * @title IRatesProvider
 * @dev IRatesProvider interface
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */
contract IRatesProvider {

  function name() public view returns (string memory);

  function rate(bytes32 _currency) public view returns (uint256);
  function decimals(bytes32 _currency) public view returns (uint256);

  function currencies() public view returns (bytes32[] memory);
  function decimals() public view returns (uint256[] memory);
  function rates() public view returns (uint256[] memory);
  function updatedAt() public view returns (uint256);

  function convertRate(uint256 _rate, bytes32 _currency, uint256 _rateETHDecimal)
    public view returns (uint256);

  function rateETH(bytes32 _currency, uint256 _rateETHDecimal)
    public view returns (uint256);

  function convertToWEI(bytes32 _currency, uint256 _amountCurrency)
    public view returns (uint256);
  function convertFromWEI(bytes32 _currency, uint256 _amountWEI)
    public view returns (uint256);
  function convertBetween(bytes32 _a, bytes32 _b, uint256 _amountA)
    public view returns (uint256);

  function defineCurrencies(
    bytes32[] memory _currencies,
    uint256[] memory _decimals) public returns (bool);
  function defineRates(uint256[] memory _rates) public returns (bool);

  event Rate(uint256 at, bytes32 indexed currency, uint256 rateFromWEI);
}
