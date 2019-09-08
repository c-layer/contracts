pragma solidity >=0.5.0 <0.6.0;

import "./abstract/Factory.sol";
import "./util/governance/Operable.sol";


/**
 * @title TokenFactory
 * 
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * TF01: Configuration must not already exist
 * TF02: Proxy code must be defined
 * TF03: Some delegates must be provided
 * TF04: Configuration must exist
 **/
contract TokenFactory is Factory, Operable {

  string public name;

  constructor(string memory _name) public {
    name = _name;
  }

  /**
   * @dev addConfiguration
   */
  function addConfiguration(
    bytes32 _configuration,
    bytes memory _code,
    address[] memory _delegates) public onlyOperator returns (bool)
  {
    require(configurations[_configuration].code.length == 0, "TF01");
    require(_code.length != 0, "TF02");
    require(_delegates.length != 0, "TF03");
    ProxyConfiguration storage proxyConfig = configurations[_configuration];
    proxyConfig.code = _code;
    proxyConfig.delegates = _delegates;
    emit ConfigurationAdded(_configuration);
    return true;
  }

  /**
   * @dev removeConfiguration
   */
  function removeConfiguration(bytes32 _configuration)
    public onlyOperator returns (bool)
  {
    require(configurations[_configuration].code.length != 0, "TF04");
    delete configurations[_configuration];
    emit ConfigurationRemoved(_configuration);
    return true;
  }
}
