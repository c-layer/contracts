pragma solidity >=0.5.0 <0.6.0;

import "./ownership/Ownable.sol";
import "./interface/IERC20.sol";


/**
 * @title TokenMigrations
 * @dev TokenMigrations contract
 * @dev This version is compatible with all ERC20 tokens
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 *
 * Error messages
 * TM01: Not enough tokens available to cover supply of previous token contract
 * TM02: All tokens should be allocated to the migrations contract to start migration
 * TM03: No tokens to migrate
 * TM04: Insufficient allowance
 * TM05: Unable to lock tokens
 * TM06: Migration is already done
 * TM07: Missing latest tokens
 * TM08: Unable to migrate tokens
 */
contract TokenMigrations is Ownable {
  struct Migration {
    uint256 totalMigrated;
    uint256 accountsMigrated;
    mapping(address => bool) accounts;
  }
  mapping(address => Migration) private migrations;

  IERC20 internal latestToken_;
  uint256 internal version_;

  /**
   * @dev contructor
   **/
  constructor(IERC20 _token) public {
    latestToken_ = _token;
  }

  /**
   * @dev isAccountMigrated
   */
  function isAccountMigrated(address _tokenAddr, address _account)
    public view returns (bool)
  {
    return migrations[_tokenAddr].accounts[_account];
  }

  /**
   * @dev accountsMigrated
   */
  function accountsMigrated(address _tokenAddr)
    public view returns (uint256)
  {
    return migrations[_tokenAddr].accountsMigrated;
  }

  /**
   * @dev totalMigrated
   */
  function totalMigrated(address _tokenAddr)
    public view returns (uint256)
  {
    return migrations[_tokenAddr].totalMigrated;
  }

  /**
   * @dev latestToken
   */
  function latestToken()
    public view returns (IERC20)
  {
    return latestToken_;
  }

  /**
   * @dev version
   */
  function version()
    public view returns (uint256)
  {
    return version_;
  }

  /**
   * @dev upgrade
   */
  function upgrade(IERC20 _newToken) public onlyOwner {
    require(_newToken.balanceOf(address(this)) == _newToken.totalSupply(), "TM01");
    require(_newToken.balanceOf(address(this)) == latestToken_.totalSupply(), "TM02");

    migrations[address(latestToken_)] = Migration(0, 0);
   
    version_++; 
    emit NewMigration(address(latestToken_));
    latestToken_ = _newToken;
  }

  /**
   * @dev acceptMigration
   * `acceptMigration` may be overriden by children contracts
   * acceptMigration must do checks and operations to ensure
   * that old tokens will be locked forever !
   */
  function acceptMigration(IERC20 _oldToken) public {
    uint256 amount = _oldToken.balanceOf(msg.sender);
    require(amount > 0, "TM03");
    require(_oldToken.allowance(msg.sender, address(this)) == amount, "TM04");
    require(_oldToken.transferFrom(msg.sender, address(this), amount), "TM05");
    migrateInternal(address(_oldToken), amount);
  }

  /**
   * @dev migrateInternal
   */
  function migrateInternal(address _oldTokenAddr, uint256 _amount)
    internal
  {
    require(!migrations[_oldTokenAddr].accounts[msg.sender], "TM06");
    require(latestToken_.balanceOf(address(this)) >= _amount, "TM07");

    migrations[_oldTokenAddr].totalMigrated += _amount;
    migrations[_oldTokenAddr].accountsMigrated++;
    migrations[_oldTokenAddr].accounts[msg.sender] = true;

    require(latestToken_.transfer(msg.sender, _amount), "TM08");
  }

  event NewMigration(address oldToken);
}
