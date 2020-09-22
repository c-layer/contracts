pragma solidity ^0.6.0;


import "../operable/Ownable.sol";
import "../interface/IRouter.sol";


/**
 * @title BasicRouter
 *
 * @dev To avoid abuse the configuration need to be locked before the redirection is active
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * RO01: configuration is locked
 * RO02: configuration has not been locked
 * RO03: invalid destinations
 * RO04: no valid routes were found
 * RO05: redirection has failed
 */
contract BasicRouter is IRouter, Ownable {

  struct Route {
    address[] destinations;
    uint256 activeDestination;
    bytes4 destinationAbi;
  }

  mapping(address => Route) public routes;
  bool public configLocked_;

  modifier configNotLocked() {
    require(!configLocked_, "RO01");
    _;
  }

  receive() override external payable {
    _callPayable(msg.value, msg.sender, msg.data);
  }

  fallback() override external payable {
    _callPayable(msg.value, msg.sender, msg.data);
  }

  function destinations(address _origin) override public view returns (address[] memory) {
    return routes[_origin].destinations;
  }

  function activeDestination(address _origin) public view returns (uint256) {
    return routes[_origin].activeDestination;
  }

  function destinationAbi(address _origin) override public view returns (bytes4) {
    return routes[_origin].destinationAbi;
  }

  function isConfigLocked() override public view returns (bool) {
    return configLocked_;
  }

  /**
   * @dev method to be overwritten by inheritance
   */
  function findDestination(address _origin) virtual public view returns (address) {
    Route memory route = routes[_origin];
    return (route.destinations.length > 0) ?
      route.destinations[route.activeDestination] : address(0);
  }

  function setRoute(
    address _origin,
    address[] memory _destinations,
    bytes4 _destinationAbi)
    override public onlyOwner configNotLocked returns (bool)
  {
    routes[_origin] = Route(_destinations, 0, _destinationAbi);
    emit RouteDefined(_origin, _destinations, _destinationAbi);
    return true;
  }

  function switchDestination(address _origin, uint256 _activeDestination)
    public onlyOwner returns (bool)
  {
    require(_activeDestination < routes[_origin].destinations.length, "RO03");
    routes[_origin].activeDestination = _activeDestination;
    
    emit DestinationSwitched(_origin, _activeDestination);
  }

  /*
   * @dev Lock the configuration
   */
  function lockConfig() override public onlyOwner configNotLocked {
    configLocked_ = true;
    emit ConfigLocked();
  }

  /*
   * @dev Send the received ETH to the configured and locked contract address
   * The call can be done only when the redirection has started
   */
  // solhint-disable-next-line no-unused-vars
  function _callPayable(uint256 _value, address _sender, bytes memory _data) virtual internal
  {
    require(configLocked_, "RO02");
    address destination = findDestination(_sender);
    require(destination != address(0), "RO04");

    bytes4 destinationAbi_ = routes[_sender].destinationAbi;

    bool success;
    bytes memory result;
    if (destinationAbi_ != bytes4(0)) {
      bytes memory encodedData =  abi.encode(destinationAbi_, _sender, _data);
      // solhint-disable-next-line avoid-call-value, avoid-low-level-calls
      (success, result) = destination.call{value: _value}(encodedData);
    } else {
      // solhint-disable-next-line avoid-call-value, avoid-low-level-calls
      (success, result) = destination.call{value:_value}(_data);
    }

    require(success, "RO05");
  }
}
