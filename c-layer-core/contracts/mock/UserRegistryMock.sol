pragma solidity >=0.5.0 <0.6.0;


/**
 * @title UserRegistryMock
 * @dev UserRegistryMock
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 **/
contract UserRegistryMock {

  bytes32 private currency_ = bytes32("CHF");
  address[] private addresses_;

  constructor(address[] memory _addresses) public {
    addresses_ = _addresses;
  }

  function currency() public view returns (bytes32) {
    return currency_;
  }

  function userId(address _address) public view returns (uint256) {
    for(uint256 i=0; i < addresses_.length; i++) {
      if(addresses_[i] == _address) {
        return i+1;
      }
    }
  }
}
