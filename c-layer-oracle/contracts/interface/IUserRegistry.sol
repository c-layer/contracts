pragma solidity >=0.5.0 <0.6.0;


/**
 * @title IUserRegistry
 * @dev IUserRegistry interface
 * @author Cyril Lapinte - <cyril@openfiz.com>
 **/
contract IUserRegistry {

  event UserRegistered(uint256 indexed userId);
  event AddressAttached(uint256 indexed userId, address address_);
  event AddressDetached(uint256 indexed userId, address address_);

  function userCount() public view returns (uint256);
  function name() public view returns (string memory);
  function userId(address _address) public view returns (uint256);
  function validUserId(address _address) public view returns (uint256);
  function validUntilTime(uint256 _userId) public view returns (uint256);
  function suspended(uint256 _userId) public view returns (bool);

  function extendedKeys() public view returns (uint256[] memory);
  function extended(uint256 _userId, uint256 _key)
    public view returns (uint256);

  function isAddressValid(address _address) public view returns (bool);
  function isValid(uint256 _userId) public view returns (bool);

  function defineExtendedKeys(uint256[] memory _extendedKeys) public returns (bool);

  function registerUser(address _address, uint256 _validUntilTime)
    public returns (bool);
  function registerManyUsers(address[] memory _addresses, uint256 _validUntilTime)
    public returns (bool);

  function registerUserFull(
    address _address,
    uint256 _validUntilTime,
    uint256[] memory _values) public returns (bool);
  function registerManyUsersFull(
    address[] memory _addresses,
    uint256 _validUntilTime,
    uint256[] memory _values) public returns (bool);

  function attachAddress(uint256 _userId, address _address) public returns (bool);
  function attachManyAddresses(uint256[] memory _userIds, address[] memory _addresses)
    public returns (bool);

  function detachAddress(address _address) public returns (bool);
  function detachManyAddresses(address[] memory _addresses)
    public returns (bool);

  function detachSelf() public returns (bool);
  function detachSelfAddress(address _address) public returns (bool);
  function suspendUser(uint256 _userId) public returns (bool);
  function unsuspendUser(uint256 _userId) public returns (bool);
  function suspendManyUsers(uint256[] memory _userIds) public returns (bool);
  function unsuspendManyUsers(uint256[] memory _userIds) public returns (bool);

  function updateUser(uint256 _userId, uint256 _validUntilTime, bool _suspended)
    public returns (bool);
  function updateManyUsers(
    uint256[] memory _userIds,
    uint256 _validUntilTime,
    bool _suspended) public returns (bool);

  function updateUserExtended(uint256 _userId, uint256 _key, uint256 _value)
    public returns (bool);
  function updateManyUsersExtended(
    uint256[] memory _userIds,
    uint256 _key, uint256 _value) public returns (bool);

  function updateUserAllExtended(uint256 _userId, uint256[] memory _values)
    public returns (bool);
  function updateManyUsersAllExtended(
    uint256[] memory _userIds,
    uint256[] memory _values) public returns (bool);

  function updateUserFull(
    uint256 _userId,
    uint256 _validUntilTime,
    bool _suspended,
    uint256[] memory _values) public returns (bool);
  function updateManyUsersFull(
    uint256[] memory _userIds,
    uint256 _validUntilTime,
    bool _suspended,
    uint256[] memory _values) public returns (bool);
}
