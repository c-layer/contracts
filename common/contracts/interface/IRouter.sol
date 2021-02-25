pragma solidity >=0.8.0;


/**
 * @title IRouter
 *
 * To avoid abuse the configuration need to be locked before the redirection is active
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 * SPDX-License-Identifier: MIT
 */
abstract contract IRouter {

  event ConfigLocked();
  event RouteDefined(address origin, address[] destinations, bytes4 destinationAbi);
  event DestinationSwitched(address origin, uint256 activeDestination);

  receive() virtual external payable;
  fallback() virtual external payable;
  function destinations(address _origin) virtual public view returns (address[] memory);
  function destinationAbi(address _origin) virtual public view returns (bytes4);
  function isConfigLocked() virtual public view returns (bool);

  function setRoute(
    address _origin,
    address[] memory _destinations,
    bytes4 _destinationAbi
    ) virtual public returns (bool);

  function lockConfig() virtual public;
}
