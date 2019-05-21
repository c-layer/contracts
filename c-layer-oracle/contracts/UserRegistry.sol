pragma solidity >=0.5.0 <0.6.0;

import "./interface/IUserRegistry.sol";
import "./util/governance/Operator.sol";

/**
 * @title UserRegistry
 * @dev UserRegistry contract
 * Configure and manage users
 * Extended may be used externaly to store data within a user context
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 *
 * Error messages
 * UR01: UserId is invalid
 * UR02: WalletOwner is already known
 * UR03: Users length does not match with addresses
 * UR04: WalletOwner is unknown
 * UR05: Sender is not the wallet owner
 * UR06: User is already suspended
 * UR07: User is not suspended
*/
contract UserRegistry is IUserRegistry, Operator {

  struct User {
    uint256 validUntilTime;
    bool suspended;
    mapping(uint256 => uint256) extended;
  }

  mapping(uint256 => User) internal users;
  mapping(address => uint256) internal walletOwners;
  uint256 internal userCount_;

  /**
   * @dev contructor
   **/
  constructor(address[] memory _addresses, uint256 _validUntilTime) public {
    for (uint256 i = 0; i < _addresses.length; i++) {
      registerUserInternal(_addresses[i], _validUntilTime);
    }
  }

  /**
   * @dev number of user registered
   */
  function userCount() public view returns (uint256) {
    return userCount_;
  }

  /**
   * @dev the userId associated to the provided address
   */
  function userId(address _address) public view returns (uint256) {
    return walletOwners[_address];
  }

  /**
   * @dev the userId associated to the provided address if the user is valid
   */
  function validUserId(address _address) public view returns (uint256) {
    uint256 addressUserId = walletOwners[_address];
    if (isValidInternal(users[addressUserId])) {
      return addressUserId;
    }
    return 0;
  }

  /**
   * @dev returns the time at which user validity ends
   */
  function validUntilTime(uint256 _userId) public view returns (uint256) {
    return users[_userId].validUntilTime;
  }

  /**
   * @dev is the user suspended
   */
  function suspended(uint256 _userId) public view returns (bool) {
    return users[_userId].suspended;
  }

  /**
   * @dev access to extended user data
   */
  function extended(uint256 _userId, uint256 _key)
    public view returns (uint256)
  {
    return users[_userId].extended[_key];
  }

  /**
   * @dev validity of the current user
   */
  function isAddressValid(address _address) public view returns (bool) {
    return isValidInternal(users[walletOwners[_address]]);
  }

  /**
   * @dev validity of the current user
   */
  function isValid(uint256 _userId) public view returns (bool) {
    return isValidInternal(users[_userId]);
  }

  /**
   * @dev register a user
   */
  function registerUser(address _address, uint256 _validUntilTime)
    public onlyOperator
  {
    registerUserInternal(_address, _validUntilTime);
  }

  /**
   * @dev register many users
   */
  function registerManyUsers(address[] memory _addresses, uint256 _validUntilTime)
    public onlyOperator
  {
    for (uint256 i = 0; i < _addresses.length; i++) {
      registerUserInternal(_addresses[i], _validUntilTime);
    }
  }

  /**
   * @dev attach an address with a user
   */
  function attachAddress(uint256 _userId, address _address)
    public onlyOperator
  {
    require(_userId > 0 && _userId <= userCount_, "UR01");
    require(walletOwners[_address] == 0, "UR02");
    walletOwners[_address] = _userId;

    emit AddressAttached(_userId, _address);
  }

  /**
   * @dev attach many addresses to many users
   */
  function attachManyAddresses(uint256[] memory _userIds, address[] memory _addresses)
    public onlyOperator
  {
    require(_addresses.length == _userIds.length, "UR03");
    for (uint256 i = 0; i < _addresses.length; i++) {
      attachAddress(_userIds[i], _addresses[i]);
    }
  }

  /**
   * @dev detach the association between an address and its user
   */
  function detachAddress(address _address) public onlyOperator {
    detachAddressInternal(_address);
  }

  /**
   * @dev detach many addresses association between addresses and their respective users
   */
  function detachManyAddresses(address[] memory _addresses) public onlyOperator {
    for (uint256 i = 0; i < _addresses.length; i++) {
      detachAddressInternal(_addresses[i]);
    }
  }

  /**
   * @dev detach the association between an address and its user
   */
  function detachSelf() public {
    detachAddressInternal(msg.sender);
  }

  /**
   * @dev detach the association between an address and its user
   */
  function detachSelfAddress(address _address) public {
    uint256 senderUserId = walletOwners[msg.sender];
    require(walletOwners[_address] == senderUserId, "UR05");
    detachAddressInternal(_address);
  }

  /**
   * @dev suspend a user
   */
  function suspendUser(uint256 _userId) public onlyOperator {
    require(_userId > 0 && _userId <= userCount_, "UR01");
    require(!users[_userId].suspended, "UR06");
    users[_userId].suspended = true;
  }

  /**
   * @dev unsuspend a user
   */
  function unsuspendUser(uint256 _userId) public onlyOperator {
    require(_userId > 0 && _userId <= userCount_, "UR01");
    require(users[_userId].suspended, "UR07");
    users[_userId].suspended = false;
  }

  /**
   * @dev suspend many users
   */
  function suspendManyUsers(uint256[] memory _userIds) public onlyOperator {
    for (uint256 i = 0; i < _userIds.length; i++) {
      suspendUser(_userIds[i]);
    }
  }

  /**
   * @dev unsuspend many users
   */
  function unsuspendManyUsers(uint256[] memory _userIds) public onlyOperator {
    for (uint256 i = 0; i < _userIds.length; i++) {
      unsuspendUser(_userIds[i]);
    }
  }

  /**
   * @dev update a user
   */
  function updateUser(
    uint256 _userId,
    uint256 _validUntilTime,
    bool _suspended) public onlyOperator
  {
    require(_userId > 0 && _userId <= userCount_, "UR01");
    users[_userId].validUntilTime = _validUntilTime;
    users[_userId].suspended = _suspended;
  }

  /**
   * @dev update many users
   */
  function updateManyUsers(
    uint256[] memory _userIds,
    uint256 _validUntilTime,
    bool _suspended) public onlyOperator
  {
    for (uint256 i = 0; i < _userIds.length; i++) {
      updateUser(_userIds[i], _validUntilTime, _suspended);
    }
  }

  /**
   * @dev update user extended information
   */
  function updateUserExtended(uint256 _userId, uint256 _key, uint256 _value)
    public onlyOperator
  {
    require(_userId > 0 && _userId <= userCount_, "UR01");
    users[_userId].extended[_key] = _value;
  }

  /**
   * @dev update many user extended informations
   */
  function updateManyUsersExtended(
    uint256[] memory _userIds,
    uint256 _key,
    uint256 _value) public onlyOperator
  {
    for (uint256 i = 0; i < _userIds.length; i++) {
      updateUserExtended(_userIds[i], _key, _value);
    }
  }

  /**
   * @dev register a user
   */
  function registerUserInternal(address _address, uint256 _validUntilTime)
    internal
  {
    require(walletOwners[_address] == 0, "UR03");
    users[++userCount_] = User(_validUntilTime, false);
    walletOwners[_address] = userCount_;

    emit UserRegistered(userCount_);
    emit AddressAttached(userCount_, _address);
  }

  /**
   * @dev detach the association between an address and its user
   */
  function detachAddressInternal(address _address) internal {
    uint256 addressUserId = walletOwners[_address];
    require(addressUserId != 0, "UR04");
    emit AddressDetached(addressUserId, _address);
    delete walletOwners[_address];
  }

  /**
   * @dev validity of the current user
   */
  function isValidInternal(User storage user) internal view returns (bool) {
    // solium-disable-next-line security/no-block-members
    return !user.suspended && user.validUntilTime > now;
  }
}
