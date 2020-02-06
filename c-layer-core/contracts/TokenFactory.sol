pragma solidity >=0.5.0 <0.6.0;

import "./abstract/Factory.sol";
import "./operable/OperableAsCore.sol";
import "./interface/IERC20.sol";
import "./interface/ITokenCore.sol";
import "./interface/ITokenFactory.sol";


/**
 * @title TokenFactory
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 *   TF01: Required privileges must be granted from the core to the factory
 *   TF02: There must be the same number of vault and supplies
 *   TF03: A proxy code must defined
 *   TF04: Token proxy must deployed
 *   TF05: Token must be defined in the core
 *   TF06: Factory role must be granted on the proxy
 *   TF07: Issuer role must be granted on the proxy
 *   TF08: The rule must be set
 *   TF09: The token must be locked
 *   TF10: Token must be minted
 *   TF11: The selector must be set
 *   TF12: The rule must be removed
 *   TF13: Same number of tokensales and allowances must be provided
 *   TF14: Exceptions must be added to the lock
 *   TF15: Allowances must be lower than the token balance
 *   TF16: Allowance must be successfull
 **/
contract TokenFactory is ITokenFactory, Factory, OperableAsCore {

  bytes4[] public REQUIRED_CORE_PRIVILEGES = [
    bytes4(keccak256("assignProxyOperators(address,bytes32,address[])")),
    bytes4(keccak256("defineToken(address,uint256,string,string,uint256)"))
  ];
  bytes4[] public REQUIRED_PROXY_PRIVILEGES = [
    bytes4(keccak256("mintAtOnce(address,address[],uint256[])")),
    bytes4(keccak256("defineLock(address,uint256,uint256,address[])")),
    bytes4(keccak256("defineRules(address,address[])"))
  ];

  bytes32 constant FACTORY_PROXY_ROLE = bytes32("FactoryProxyRole");
  bytes32 constant ISSUER_PROXY_ROLE = bytes32("IssuerProxyRole");

  /**
   * @dev constructor
   **/
  constructor(address _core) public OperableAsCore(_core) {}

  /**
   * @dev defineProxyCode
   */
  function defineProxyCode(bytes memory _code)
    public onlyCoreOperator returns (bool)
  {
    return defineProxyCodeInternal(address(core), _code);
  }

  /**
   * @dev has core access
   */
  function hasCoreAccess() public view returns (bool access) {
    access = true;
    for (uint256 i=0; i<REQUIRED_CORE_PRIVILEGES.length; i++) {
      access = access && hasCorePrivilege(
        address(this), REQUIRED_CORE_PRIVILEGES[i]);
    }
    for (uint256 i=0; i<REQUIRED_PROXY_PRIVILEGES.length; i++) {
      access = access && core.rolePrivilege(
        FACTORY_PROXY_ROLE, REQUIRED_PROXY_PRIVILEGES[i]);
    }
  }

  /**
   * @dev deploy token
   */
  function deployToken(
    uint256 _delegateId,
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    uint256 _lockEnd,
    address[] memory _vaults,
    uint256[] memory _supplies,
    address[] memory _proxyOperators
  ) public returns (address) {
    require(hasCoreAccess(), "TF01");
    require(_vaults.length == _supplies.length, "TF02");
    require(proxyCode_.length != 0, "TF03");

    // 1- Creating a proxy
    address token = deployProxyInternal();
    require(token != address(0), "TF04");

    // 2- Defining the token in the core
    ITokenCore tokenCore = ITokenCore(address(core));
    require(tokenCore.defineToken(
      token, _delegateId, _name, _symbol, _decimals), "TF05");

    // 3- Assign roles
    address[] memory factoryAddress = new address[](1);
    factoryAddress[0] = address(this);
    require(tokenCore.assignProxyOperators(token, FACTORY_PROXY_ROLE, factoryAddress), "TF06");
    require(tokenCore.assignProxyOperators(token, ISSUER_PROXY_ROLE, _proxyOperators), "TF07");

    // 4- Define rules
    // Token is locked for review by core operators
    // Removing the token factory from the rules will unlocked the token
    IRule[] memory factoryRules = new IRule[](1);
    factoryRules[0] = IRule(address(this));
    require(tokenCore.defineRules(token, factoryRules), "TF08");

    // 5- Locking the token
    if (_lockEnd > now) {
      require(tokenCore.defineLock(token, 0, _lockEnd, new address[](0)), "TF09");
    }

    // 6- Minting the token
    require(tokenCore.mintAtOnce(token, _vaults, _supplies), "TF10");

    emit TokenDeployed(token);
    return token;
  }

  /**
   * @dev reviewToken
   */
  function reviewToken(address _token)
    public onlyCoreOperator returns (bool)
  {
    require(hasCoreAccess(), "TF01");

    ITokenCore tokenCore = ITokenCore(address(core));
    require(tokenCore.defineRules(_token, new IRule[](0)), "TF12");
    emit TokenReviewed(_token);
    return true;
  }

  /**
   * @dev configureTokensales
   */
  function configureTokensales(address _token,
    address[] memory _tokensales, uint256[] memory _allowances)
    public onlyProxyOperator(_token) returns (bool)
  {
    require(hasCoreAccess(), "TF01");
    require(_tokensales.length == _allowances.length, "TF13");

    ITokenCore tokenCore = ITokenCore(address(core));
    (,,,,uint256[2] memory schedule,,,) = tokenCore.token(_token);
    require(tokenCore.defineLock(_token, schedule[0], schedule[1], _tokensales), "TF14");

    updateAllowances(_token, _tokensales, _allowances);
    emit TokensalesConfigured(_token, _tokensales);
  }

  /**
   * @dev updateAllowance
   */
  function updateAllowances(address _token, address[] memory _spenders, uint256[] memory _allowances)
    public onlyProxyOperator(_token) returns (bool)
  {
    uint256 balance = IERC20(_token).balanceOf(address(this));
    for(uint256 i=0; i < _spenders.length; i++) {
      require(_allowances[i] <= balance, "TF15");
      require(IERC20(_token).approve(_spenders[i], _allowances[i]), "TF16");
      emit AllowanceUpdated(_token, _spenders[i], _allowances[i]);
    }
  }
}
