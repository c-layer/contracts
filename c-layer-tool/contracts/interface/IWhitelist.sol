pragma solidity >=0.5.0 <0.6.0;


/**
 * @title IWhitelist
 * @dev IWhitelist interface
 * @author Cyril Lapinte - <cyril@openfiz.com>
 **/
contract IWhitelist {
  function approveManyAddresses(address[] calldata _addresses) external;
  function rejectManyAddresses(address[] calldata _addresses) external;

  function whitelistCount() public view returns (uint256);
  function isWhitelisted(address _address) public view returns (bool);
  function approveAddress(address _address) public;
  function rejectAddress(address _address) public;

  event AddressApproved(address indexed _address);
  event AddressRejected(address indexed _address);
}
