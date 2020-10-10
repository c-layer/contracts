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
 *   TF09: The token must have its locks
 *   TF10: The token must be locked
 *   TF11: Token must be minted
 *   TF12: Token minting must be finished
 *   TF13: Incorrect core provided
 *   TF14: The rule must be removed
 *   TF15: Same number of tokensales and allowances must be provided
 *   TF16: Exceptions must be added to the lock
 *   TF17: Allowances must be lower than the token balance
 *   TF18: Allowance must be successful
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
    require(_core.assignProxyOperators(address(token), ISSUER_PROXY_ROLE, _proxyOperators), "TF07");

    // 4- Define rules
    // Token is blocked for review and approval by core operators
    // This contract is used as a YesNo rule configured as No to prevent transfers
    // Removing this contract from the rules will unlock the token
    IRule[] memory factoryRules = new IRule[](1);
    factoryRules[0] = IRule(address(this));
    require(_core.defineRules(address(token), factoryRules), "TF08");

    // 5- Locking the token
    // solhint-disable-next-line not-rely-on-time
    if (_lockEnd > now) {
      address[] memory locks = new address[](1);
      locks[0] = address(token);
      require(_core.defineTokenLocks(address(token), locks), "TF09");
      require(_core.defineLock(address(token), 0, _lockEnd, new address[](0)), "TF10");
    }

    // 6- Minting the token
    require(_core.mint(address(token), _vaults, _supplies), "TF11");

    // 7 - Finish the minting
    if(_finishMinting) {
      require(_core.finishMinting(address(token)), "TF12");
    }

    emit TokenDeployed(token);
    return token;
  }

  /**
   * @dev approveToken
   */
  function approveToken(ITokenCore _core, ITokenProxy _token)
    override public onlyCoreOperator(_core) returns (bool)
  {
    require(hasCoreAccess(_core), "TF01");
    require(_token.core() == address(_core), "TF13");

    // This ensure that the call does not change a custom made rules configuration
    (,,,,,,IRule[] memory rules) = _core.token(address(_token));
    if (rules.length == 1 && rules[0] == IRule(this)) {
      require(_core.defineRules(
        address(_token), new IRule[](0)), "TF14");
    }
    emit TokenApproved(_token);
    return true;
  }

  /**
   * @dev configureTokensales
   */
  function configureTokensales(
    ITokenProxy _token,
    address[] memory _tokensales,
    uint256[] memory _allowances)
    override public onlyProxyOperator(Proxy(address(_token))) returns (bool)
  {
    ITokenCore core = ITokenCore(_token.core());
    require(hasCoreAccess(core), "TF01");
    require(_tokensales.length == _allowances.length, "TF15");

    (uint256 startAt, uint256 endAt,) = core.lock(address(_token));
    require(core.defineLock(address(_token), startAt, endAt, _tokensales), "TF16");

    updateAllowances(_token, _tokensales, _allowances);
    emit TokensalesConfigured(_token, _tokensales);
  }

  /**
   * @dev updateAllowance
   */
  function updateAllowances(
    ITokenProxy _token,
    address[] memory _spenders,
    uint256[] memory _allowances)
    override public onlyProxyOperator(_token) returns (bool)
  {
    uint256 balance = _token.balanceOf(address(this));
    for(uint256 i=0; i < _spenders.length; i++) {
      require(_allowances[i] <= balance, "TF17");
      require(_token.approve(_spenders[i], _allowances[i]), "TF18");
      emit AllowanceUpdated(_token, _spenders[i], _allowances[i]);
    }
  }
}
