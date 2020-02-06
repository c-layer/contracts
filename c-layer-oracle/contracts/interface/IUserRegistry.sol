pragma solidity >=0.5.0 <0.6.0;


/**
 * @title IUserRegistry
 * @dev IUserRegistry interface
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 **/
contract IUserRegistry {

  enum KeyCode {
    KYC_LIMIT_KEY,
    RECEPTION_LIMIT_KEY,
    EMISSION_LIMIT_KEY
  }

  event UserRegistered(uint256 indexed userId, address address_, uint256 validUntilTime);
  event AddressAttached(uint256 indexed userId, address address_);
  event AddressDetached(uint256 indexed userId, address address_);
  event UserSuspended(uint256 indexed userId);
  event UserRestored(uint256 indexed userId);
  event UserValidity(uint256 indexed userId, uint256 validUntilTime);
  event UserExtendedKey(uint256 indexed userId, uint256 key, uint256 value);
  event UserExtendedKeys(uint256 indexed userId, uint256[] values);

  event ExtendedKeysDefinition(uint256[] keys);

  function registerManyUsersExternal(address[] calldata _addresses, uint256 _validUntilTime)
    external returns (bool);
  function registerManyUsersFullExternal(
    address[] calldata _addresses,
    uint256 _validUntilTime,
    uint256[] calldata _values) external returns (bool);
  function attachManyAddressesExternal(uint256[] calldata _userIds, address[] calldata _addresses)
    external returns (bool);
  function detachManyAddressesExternal(address[] calldata _addresses)
    external returns (bool);
  function suspendManyUsersExternal(uint256[] calldata _userIds) external returns (bool);
  function restoreManyUsersExternal(uint256[] calldata _userIds) external returns (bool);
  function updateManyUsersExternal(
    uint256[] calldata _userIds,
    uint256 _validUntilTime,
    bool _suspended) external returns (bool);
  function updateManyUsersExtendedExternal(
    uint256[] calldata _userIds,
    uint256 _key, uint256 _value) external returns (bool);
  function updateManyUsersAllExtendedExternal(
    uint256[] calldata _userIds,
    uint256[] calldata _values) external returns (bool);
  function updateManyUsersFullExternal(
    uint256[] calldata _userIds,
    uint256 _validUntilTime,
    bool _suspended,
    uint256[] calldata _values) external returns (bool);

  function name() public view returns (string memory);
  function currency() public view returns (bytes32);

  function userCount() public view returns (uint256);
  function userId(address _address) public view returns (uint256);
  function validUserId(address _address) public view returns (uint256);
  function validUser(address _address, uint256[] memory _keys)
    public view returns (uint256, uint256[] memory);
  function validity(uint256 _userId) public view returns (uint256, bool);

  function extendedKeys() public view returns (uint256[] memory);
  function extended(uint256 _userId, uint256 _key)
    public view returns (uint256);
  function manyExtended(uint256 _userId, uint256[] memory _key)
    public view returns (uint256[] memory);

  function isAddressValid(address _address) public view returns (bool);
  function isValid(uint256 _userId) public view returns (bool);

  function defineExtendedKeys(uint256[] memory _extendedKeys) public returns (bool);

  function registerUser(address _address, uint256 _validUntilTime)
    public returns (bool);
  function registerUserFull(
    address _address,
    uint256 _validUntilTime,
    uint256[] memory _values) public returns (bool);

  function attachAddress(uint256 _userId, address _address) public returns (bool);
  function detachAddress(address _address) public returns (bool);
  function detachSelf() public returns (bool);
  function detachSelfAddress(address _address) public returns (bool);
  function suspendUser(uint256 _userId) public returns (bool);
  function restoreUser(uint256 _userId) public returns (bool);
  function updateUser(uint256 _userId, uint256 _validUntilTime, bool _suspended)
    public returns (bool);
  function updateUserExtended(uint256 _userId, uint256 _key, uint256 _value)
    public returns (bool);
  function updateUserAllExtended(uint256 _userId, uint256[] memory _values)
    public returns (bool);
  function updateUserFull(
    uint256 _userId,
    uint256 _validUntilTime,
    bool _suspended,
    uint256[] memory _values) public returns (bool);
}
