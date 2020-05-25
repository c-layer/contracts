pragma solidity >=0.5.0 <0.6.0;

import "../interface/IAccessDefinitions.sol";
import "../interface/IERC20.sol";
import "../interface/ITokenCore.sol";


/**
 * @title TokenFactory
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 **/
contract ITokenFactory is IAccessDefinitions {

  uint256 constant TOKEN_PROXY = 0;

  // The definitions below should be considered as a constant
  // Solidity 0.6.x do not provide ways to have arrays as constants
  bytes4[] public requiredCorePrivileges = [
    ASSIGN_PROXY_OPERATOR_PRIV,
    DEFINE_TOKEN_PRIV
  ];
  bytes4[] public requiredProxyPrivileges = [
    MINT_PRIV,
    FINISH_MINTING_PRIV,
    DEFINE_LOCK_PRIV,
    DEFINE_RULES_PRIV
  ];

  function hasCoreAccess(ITokenCore _core) public view returns (bool access);

  function defineProxyCode(bytes memory _code) public returns (bool);
  function deployToken(
    ITokenCore _core,
    uint256 _delegateId,
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    uint256 _lockEnd,
    bool _finishMinting,
    address[] memory _vaults,
    uint256[] memory _supplies,
    address[] memory _proxyOperators
  ) public returns (IERC20);
  function reviewToken(
    ITokenCore _core,
    IERC20 _token) public returns (bool);
  function configureTokensales(
    ITokenCore _core,
    IERC20 _token,
    address[] memory _tokensales,
    uint256[] memory _allowances) public returns (bool);
  function updateAllowances(
    ITokenCore _core,
    IERC20 _token,
    address[] memory _spenders,
    uint256[] memory _allowances) public returns (bool);

  event TokenDeployed(IERC20 token);
  event TokenReviewed(IERC20 token);
  event TokensalesConfigured(IERC20 token, address[] tokensales);
  event AllowanceUpdated(IERC20 token, address spender, uint256 allowance);
}
