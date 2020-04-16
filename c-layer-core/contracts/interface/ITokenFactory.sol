pragma solidity >=0.5.0 <0.6.0;


/**
 * @title TokenFactory
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 **/
contract ITokenFactory {

  function hasCoreAccess() public view returns (bool access);

  function defineProxyCode(bytes memory _code) public returns (bool);
  function deployToken(
    uint256 _delegateId,
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    uint256 _lockEnd,
    address[] memory _vaults,
    uint256[] memory _supplies,
    address[] memory _proxyOperators
  ) public returns (address);
  function reviewToken(address _token,
    address[] memory _auditSelectors) public returns (bool);
  function configureTokensales(address _token,
    address[] memory _tokensales, uint256[] memory _allowances) public returns (bool);
  function updateAllowances(address _token,
    address[] memory _spenders, uint256[] memory _allowances) public returns (bool);

  event TokenDeployed(address token);
  event TokenReviewed(address token);
  event TokensalesConfigured(address token, address[] tokensales);
  event AllowanceUpdated(address token, address spender, uint256 allowance);
}
