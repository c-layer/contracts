pragma solidity >=0.5.0 <0.6.0;


/**
 * @title UserRegistryMock
 * @dev UserRegistryMock
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 **/
contract UserRegistryMock {

  bytes32 private currency_ = bytes32("CHF");
  address[] private addresses_;
  uint256[] private keyValues_;

  constructor(address[] memory _addresses, uint256[] memory _keyValues) public {
    addresses_ = _addresses;
    keyValues_ = _keyValues;
  }

  function currency() public view returns (bytes32) {
    return currency_;
  }

  function validUserId(address _address) public view returns (uint256)
  {
    return userId(_address);
  }

  function validUser(address _address, uint256[] memory _keys)
    public view returns (uint256, uint256[] memory)
  {
    uint256[] memory values = new uint256[](_keys.length);
    for (uint256 i=0; i < _keys.length; i++) {
      values[i] = keyValues_[i];
    }
    return (userId(_address), values);
  }

  function userId(address _address) public view returns (uint256) {
    for (uint256 i=0; i < addresses_.length; i++) {
      if (addresses_[i] == _address) {
        return i+1;
      }
    }
  }
}
