pragma solidity >=0.5.0 <0.6.0;


/**
 * @title ProxyFactory
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 **/
contract ProxyFactory {

  struct Proxy {
    address address_;
    bytes32 templateName;
  }

  struct Template {
    bytes proxyCode;
    address core;
  }

  string public name;
  uint256 public proxyCount;
  mapping(bytes32 => Template) internal templates;
  mapping(uint256 => Proxy) internal proxies;

  constructor(string memory _name) public {
    name = _name;
  }

  function template(bytes32 _name) public view returns (bytes memory, address) {
    Template memory t = templates[_name];
    return (t.proxyCode, t.core);
  }

  function proxy(uint256 _proxyId) public view returns (address, bytes32) {
    Proxy memory p = proxies[_proxyId];
    return (p.address_, p.templateName);
  }

  function addTemplate(bytes32 _name, bytes memory _proxyCode, address _core) public {
    templates[_name] = Template(_proxyCode, _core);
    emit NewTemplate(_name);
  }

  function createProxy(
    bytes32 _templateName
  ) public {
    Template memory t = templates[_templateName];
    require(t.proxyCode.length > 0, "FC01");

    // Create proxy
    // TODO
    address address_ = address(0); 

    Proxy storage p = proxies[++proxyCount];
    p.address_ = address_;
    p.templateName = _templateName;
   
    emit ProxyDefined(address_, _templateName);
  }

  event NewTemplate(bytes32 _name);
  event ProxyDefined(address _address, bytes32 _template);
}
