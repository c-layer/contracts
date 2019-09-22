pragma solidity >=0.5.0 <0.6.0;


/**
 * @title Factory
 * 
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * FY01: Configuration does not exist or no bytecode has been defined
 * FY02: A core must be provided
 **/
contract Factory {

  struct ProxyConfiguration {
    bytes code;
    address[] delegates;
  }

  mapping (bytes32 => ProxyConfiguration) internal configurations;
  mapping (uint256 => address) public proxies;
  uint256 public proxyCount;

  function delegates(bytes32 _configuration)
    public view returns (address[] memory)
  {
    return configurations[_configuration].delegates;
  }

  function codeHash(bytes32 _configuration)
    public view returns (bytes32)
  {
    return keccak256(configurations[_configuration].code);
  }

  function createProxy(bytes32 _configuration, address _core) public returns (address proxy)
  {
    bytes memory code = configurations[_configuration].code;
    require(code.length != 0, "FY01");
    require(_core != address(0), "FY02");

    assembly {
      // The code must the direct previous memory value
      let param1 := mload(0x40)
      mstore(param1, _core)
      let length := add(mload(code), 0x20)
      proxy := create(0, add(code, 0x20), length)
    }
    
    proxies[++proxyCount] = proxy;
    emit ProxyCreated(proxy, _core, _configuration);
    return proxy;
  }

  event ConfigurationAdded(bytes32 configuration);
  event ConfigurationRemoved(bytes32 configuration);
  event ProxyCreated(address proxy, address indexed core, bytes32 indexed configuration);
}
