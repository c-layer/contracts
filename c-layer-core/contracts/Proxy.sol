pragma solidity >=0.5.0 <0.6.0;

import "./Core.sol";
import "./util/convert/BytesConvert.sol";


/**
 * @title Proxy
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 **/
contract Proxy {
  using BytesConvert for bytes;

  address public core;

  constructor(address _core) public {
    core = _core;
  }
}
