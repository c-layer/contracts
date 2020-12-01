pragma solidity ^0.6.0;

import "@c-layer/common/contracts/factory/Factory.sol";
import "@c-layer/common/contracts/operable/Operable.sol";
import "@c-layer/common/contracts/operable/OperableAsCore.sol";
import "@c-layer/common/contracts/interface/IERC20.sol";
import "@c-layer/distribution/contracts/interface/IWrappedERC20.sol";
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
 *   TF03: Token proxy contract must be deployed
 *   TF04: Token must be defined in the core
 *   TF05: Issuer role must be granted on the proxy
 *   TF06: The rule must be set
 *   TF07: The token must have its locks
 *   TF08: The token must be locked
 *   TF09: Token must be minted
 *   TF10: Token minting must be finished
 *   TF11: Incorrect core provided
 *   TF12: The rule must be removed
 *   TF13: DefineAuditTriggers privileges is required for setting compliance
 *   TF14: Wrapped token contract must be deployed
 *   TF15: Wrapped token contract should be operator on token
 *   TF16: Audit triggers should be successfully configured
 *   TF17: Wrapped tokens should be distributed
 *   TF18: WWrapped token contract should be approved on token
 *   TF19: Wrapped token contract should be operator on token
 *   TF20: Same number of tokensales and allowances must be provided
 *   TF21: Exceptions must be added to the lock
 *   TF22: Allowance must be lower than the token balance
 *   TF23: Allowance must be successful
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
   * @dev defineBlueprint
   */
  function defineBlueprint(
    uint256 _id,
    address _template,
    bytes memory _bytecode,
    bytes memory _defaultParameters) override public onlyOperator returns (bool)
  {
    return defineBlueprintInternal(_id, _template, _bytecode, _defaultParameters);
  }

  /**
   * @dev deployContract
   */
  function deployContract(uint256 _id, bytes memory _parameters)
    public override returns (address)
  {
    return deployContractInternal(_id, _parameters);
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
    uint64 _lockEnd,
    bool _finishMinting,
    address[] memory _vaults,
    uint256[] memory _supplies,
    address[] memory _proxyOperators
  ) override public returns (IERC20) {
    require(hasCoreAccess(_core), "TF01");
    require(_vaults.length == _supplies.length, "TF02");

    // 1- Creating a proxy
    IERC20 token = IERC20(deployContractInternal(
      uint256(ProxyCode.TOKEN), abi.encode(address(_core))));
    require(address(token) != address(0), "TF03");

    // 2- Defining the token in the core
    require(_core.defineToken(
      address(token), _delegateId, _name, _symbol, _decimals), "TF04");

    // 3- Assign roles
    require(_core.assignProxyOperators(address(token), ISSUER_PROXY_ROLE, _proxyOperators), "TF05");

    // 4- Define rules
    // Token is blocked for review and approval by core operators
    // This contract is used as a YesNo rule configured as No to prevent transfers
    // Removing this contract from the rules will unlock the token
    if (!_core.hasCorePrivilege(msg.sender, APPROVE_TOKEN_PRIV)) {
      IRule[] memory factoryRules = new IRule[](1);
      factoryRules[0] = IRule(address(this));
      require(_core.defineRules(address(token), factoryRules), "TF06");
    }

    // 5- Locking the token
    // solhint-disable-next-line not-rely-on-time
    if (_lockEnd > now) {
      address[] memory locks = new address[](1);
      locks[0] = address(token);
      require(_core.defineTokenLocks(address(token), locks), "TF07");
      require(_core.defineLock(
        address(token),
        ANY_ADDRESSES,
        ANY_ADDRESSES,
        0,
        _lockEnd), "TF08");
    }

    // 6- Minting the token
    require(_core.mint(address(token), _vaults, _supplies), "TF09");

    // 7 - Finish the minting
    if(_finishMinting) {
      require(_core.finishMinting(address(token)), "TF10");
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
    require(_token.core() == address(_core), "TF11");

    // This ensure that the call does not change a custom made rules configuration
    (,,,,,,IRule[] memory rules) = _core.token(address(_token));
    if (rules.length == 1 && rules[0] == IRule(this)) {
      require(_core.defineRules(address(_token), new IRule[](0)), "TF12");
    }
    emit TokenApproved(_token);
    return true;
  }

  /**
   * @dev deploy wrapped token
   */
  function deployWrappedToken(
    ITokenProxy _token,
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    address[] memory _vaults,
    uint256[] memory _supplies,
    bool _compliance
  ) override public onlyProxyOperator(Proxy(address(_token))) returns (IERC20) {
    require(_vaults.length == _supplies.length, "TF02");

    ITokenCore core;
    if (_compliance) {
      core = ITokenCore(_token.core());
      require(hasCoreAccess(core), "TF01");
      require(core.hasCorePrivilege(msg.sender, DEFINE_AUDIT_TRIGGERS_PRIV), "TF13");
    }

    // 1- Creating a wrapped token
    IWrappedERC20 wToken = IWrappedERC20(deployContractInternal(
      uint256(ProxyCode.WRAPPED_TOKEN),
      abi.encode(_name, _symbol, _decimals, address(_token))));
    require(address(wToken) != address(0), "TF14");

    emit WrappedTokenDeployed(_token, wToken);

    // 2- Compliance Configuration
    if (_compliance) {
      // Avoid the approval step for non self managed users
      address[] memory operators = new address[](1);
      operators[0] = address(wToken);
      require(core.assignProxyOperators(address(_token), OPERATOR_PROXY_ROLE, operators), "TF15");

      // Avoid KYC restrictions for the wrapped tokens (AuditConfigurationId == 0)
      {
        uint256 delegateId = core.proxyDelegateId(address(_token));
        uint256 auditConfigurationId = core.delegatesConfigurations(delegateId)[0];
        address[] memory senders = new address[](2);
        senders[0] = ANY_ADDRESSES;
        senders[1] = address(wToken);
        address[] memory receivers = new address[](2);
        receivers[0] = address(wToken);
        receivers[1] = ANY_ADDRESSES;
        ITokenStorage.AuditTriggerMode[] memory modes = new ITokenStorage.AuditTriggerMode[](2);
        modes[0] = ITokenStorage.AuditTriggerMode.NONE;
        modes[1] = ITokenStorage.AuditTriggerMode.RECEIVER_ONLY;
        require(core.defineAuditTriggers(auditConfigurationId,
          senders, receivers, modes), "TF16");
      }

      require(core.defineLock(address(_token), address(this), ANY_ADDRESSES, ~uint64(0), ~uint64(0)), "TF17");
    } else {
      require(_token.approve(address(wToken), ~uint256(0)), "TF18");
    }

    // 3- Wrap tokens
    for(uint256 i=0; i < _vaults.length; i++) {
      require(wToken.depositTo(_vaults[i], _supplies[i]), "TF19");
    }

    return wToken;
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
    require(_tokensales.length == _allowances.length, "TF20");

    for(uint256 i=0; i < _tokensales.length; i++) {
      require(core.defineLock(address(_token), _tokensales[i], ANY_ADDRESSES, ~uint64(0), ~uint64(0)), "TF21");
    }

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
      require(_allowances[i] <= balance, "TF22");
      require(_token.approve(_spenders[i], _allowances[i]), "TF23");
      emit AllowanceUpdated(_token, _spenders[i], _allowances[i]);
    }
  }
}
