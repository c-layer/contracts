pragma solidity >=0.5.0 <0.6.0;

import "../util/convert/BytesConvert.sol";


/**
 * @title Factory
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 **/
contract Factory {
  using BytesConvert for bytes;

  bytes internal proxyCode_;

  /**
   * @dev proxyCode
   */
  function proxyCode() public view returns (bytes memory) {
    return proxyCode_;
  }

  /**
   * @dev defineProxyCodeInternal
   */
  function defineProxyCodeInternal(address _core, bytes memory _proxyCode)
    internal returns (bool)
  {
    bytes32 coreAddress = abi.encode(_core).toBytes32();
    proxyCode_ = abi.encodePacked(_proxyCode, coreAddress);
    emit ProxyCodeDefined(keccak256(_proxyCode));
    return true;
  }

  /**
   * @dev deployProxyInternal
   */
  function deployProxyInternal()
    internal returns (address address_)
  {
    bytes memory code = proxyCode_;
    assembly {
      address_ := create(0, add(code, 0x20), mload(code))
    }
  }

  event ProxyCodeDefined(bytes32 codeHash);
}
