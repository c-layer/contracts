pragma solidity >=0.5.0 <0.6.0;

import "./governance/Ownable.sol";
import "./interface/IWhitelist.sol";


/**
 * @title Whitelist
 * @dev Whitelist contract
 *
 * Whitelist a list of addresses only updatable by the owner
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */
contract Whitelist is IWhitelist, Ownable {

  mapping(address => bool) internal whitelist;
  uint256 internal whitelistCount_;

  /**
   * @dev Constructor
   */
  constructor(address[] memory _addresses) public {
    for (uint256 i = 0; i < _addresses.length; i++) {
      approveAddress(_addresses[i]);
    }
  }

  /**
   * @dev Approve many addresses
   **/
  function approveManyAddresses(address[] calldata _addresses) external onlyOwner {
    for (uint256 i = 0; i < _addresses.length; i++) {
      approveAddress(_addresses[i]);
    }
  }

  /**
   * @dev Reject many addresses
   **/
  function rejectManyAddresses(address[] calldata _addresses) external onlyOwner {
    for (uint256 i = 0; i < _addresses.length; i++) {
      rejectAddress(_addresses[i]);
    }
  }

  /**
   * @dev getter need to be declared to comply with IWhitelist interface
   */
  function whitelistCount() public view returns (uint256) {
    return whitelistCount_;
  }

  /**
   * @dev Is the address whitelisted
   **/
  function isWhitelisted(address _address) public view returns (bool) {
    return whitelist[_address];
  }

  /** 
   * @dev Approve the provided address
   **/
  function approveAddress(address _address) public onlyOwner {
    if (!whitelist[_address]) {
      whitelist[_address] = true;
      whitelistCount_++;
      emit AddressApproved(_address);
    }
  }

  /**
   * @dev Reject the provided address
   **/
  function rejectAddress(address _address) public onlyOwner {
    if (whitelist[_address]) {
      whitelist[_address] = false;
      whitelistCount_--;
      emit AddressRejected(_address);
    }
  }

  event AddressApproved(address indexed _address);
  event AddressRejected(address indexed _address);
}
