pragma solidity ^0.6.0;

import "@c-layer/common/contracts/factory/Factory.sol";
import "@c-layer/common/contracts/operable/Operable.sol";
import "@c-layer/common/contracts/operable/OperableAsCore.sol";
import "@c-layer/common/contracts/interface/IERC20.sol";
import "./interface/ITokenCore.sol";
import "./interface/ITokenFactory.sol";
import "./rule/YesNoRule.sol";


/**
 * @title TokenFactory
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   TF01: required privileges must be granted from the core to the factory
 *   TF02: There must be the same number of vault and supplies
 *   TF03: A proxy code must be defined
 *   TF04: Token proxy must be deployed
 *   TF05: Token must be defined in the core
 *   TF06: Factory role must be granted on the proxy
 *   TF07: Issuer role must be granted on the proxy
 *   TF08: The rule must be set
 *   TF09: The token must be locked
 *   TF10: Token must be minted
 *   TF11: Token minting must be finished
 *   TF12: The rule must be removed
 *   TF13: Same number of tokensales and allowances must be provided
 *   TF14: Exceptions must be added to the lock
 *   TF15: Allowances must be lower than the token balance
 *   TF16: Allowance must be successfull
 **/
contract TokenFactory is ITokenFactory, Factory, OperableAsCore, YesNoRule, Operable {

  /*
   * @dev constructor
   */
  constructor() public YesNoRule(false) {}

  /*
   * @dev has core access
   */
  function hasCoreAccess(ITokenCore _core) override public view returns (bool access) {
    access = true;
    for (uint256 i=0; i<requiredCorePrivileges.length; i++) {
      access = access && _core.hasCorePrivilege(
        address(this), requiredCorePrivileges[i]);
    }

    for (uint256 i=0; i<requiredProxyPrivileges.length; i++) {
      access = access && _core.hasProxyPrivilege(
        address(this), ALL_PROXIES, requiredProxyPrivileges[i]);
    }
  }

  /**
   * @dev defineProxyCode
   */
  function defineProxyCode(bytes memory _code)
    override public onlyOperator returns (bool)
  {
    return defineCodeInternal(uint256(TOKEN_PROXY), _code);
  }

  /**
   * @dev deploy token
   */
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
  ) override public returns (IERC20) {
    require(hasCoreAccess(_core), "TF01");
    require(_vaults.length == _supplies.length, "TF02");
    require(contractCodes_[uint256(TOKEN_PROXY)].length != 0, "TF03");

    // 1- Creating a proxy
    IERC20 token = IERC20(deployContractInternal(
      uint256(TOKEN_PROXY), abi.encode(address(_core))));
    require(address(token) != address(0), "TF04");

    // 2- Defining the token in the core
    require(_core.defineToken(
      address(token), _delegateId, _name, _symbol, _decimals), "TF05");

    // 3- Assign roles
    address[] memory factoryAddress = new address[](1);
    factoryAddress[0] = address(this);
    require(_core.assignProxyOperators(address(token), ISSUER_PROXY_ROLE, _proxyOperators), "TF07");

    // 4- Define rules
    // Token is locked for review by core operators
    // Removing the token factory from the rules will unlocked the token
    IRule[] memory factoryRules = new IRule[](1);
    factoryRules[0] = IRule(address(this));
    require(_core.defineRules(address(token), factoryRules), "TF08");

    // 5- Locking the token
    if (_lockEnd > now) {
      require(_core.defineLock(address(token), 0, _lockEnd, new address[](0)), "TF09");
    }

    // 6- Minting the token
    require(_core.mint(address(token), _vaults, _supplies), "TF10");

    // 7 - Finish the minting
    if(_finishMinting) {
      require(_core.finishMinting(address(token)), "TF11");
    }

    emit TokenDeployed(token);
    return token;
  }

  /**
   * @dev reviewToken
   */
  function reviewToken(ITokenCore _core, IERC20 _token)
    override public onlyCoreOperator(_core) returns (bool)
  {
    require(hasCoreAccess(_core), "TF01");
    require(_core.defineRules(address(_token), new IRule[](0)), "TF12");
    emit TokenReviewed(_token);
    return true;
  }

  /**
   * @dev configureTokensales
   */
  function configureTokensales(
    ITokenCore _core,
    IERC20 _token,
    address[] memory _tokensales,
    uint256[] memory _allowances)
    override public onlyProxyOperator(_core, address(_token)) returns (bool)
  {
    require(hasCoreAccess(_core), "TF01");
    require(_tokensales.length == _allowances.length, "TF13");

    (,,,,uint256[2] memory schedule,,,) = _core.token(address(_token));
    require(_core.defineLock(address(_token), schedule[0], schedule[1], _tokensales), "TF14");

    updateAllowances(_core, _token, _tokensales, _allowances);
    emit TokensalesConfigured(_token, _tokensales);
  }

  /**
   * @dev updateAllowance
   */
  function updateAllowances(
    ITokenCore _core,
    IERC20 _token,
    address[] memory _spenders,
    uint256[] memory _allowances)
    override public onlyProxyOperator(_core, address(_token)) returns (bool)
  {
    uint256 balance = _token.balanceOf(address(this));
    for(uint256 i=0; i < _spenders.length; i++) {
      require(_allowances[i] <= balance, "TF15");
      require(_token.approve(_spenders[i], _allowances[i]), "TF16");
      emit AllowanceUpdated(_token, _spenders[i], _allowances[i]);
    }
  }
}
