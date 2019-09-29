pragma solidity >=0.5.0 <0.6.0;

import "../abstract/Core.sol";


/**
 * @title CoreMock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 *   AM01: Must be successfull
 *   AM02: Value must be not null
 *   AM03: Message must be defined
 */
contract CoreMock is Core {

  constructor(address[] memory _delegates) public
  {
    delegates = _delegates;
  }

  function defineProxyMock(address _proxy, uint256 _delegateId) public returns (bool) {
    return defineProxy(_proxy, _delegateId);
  }

  function successOnlyProxy(bool _success) public view onlyProxy returns (bool) {
    return _success;
  }

  function delegateCallMock(bool) public returns (bool) {
    return delegateCall(msg.sender);
  }

  function delegateCallUint256Mock(uint256) public returns (uint256) {
    return delegateCallUint256(msg.sender);
  }

  function delegateCallBytesMock(bytes memory) public returns (bytes memory) {
    return delegateCallBytes(msg.sender);
  }

  function removeProxyMock(address _proxy) public returns (bool) {
    return removeProxy(_proxy);
  }
}
