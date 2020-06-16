pragma solidity >=0.5.0 <0.6.0;

import "../abstract/Delegate.sol";


/**
 * @title DelegateMock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 *   AM01: Must be successfull
 *   AM02: Value must be not null
 *   AM03: Message must be defined
 */
contract DelegateMock is Delegate {

  function delegateCallMock(bool _success) public pure returns (bool) {
    require(_success, "AM01");
    return _success;
  }

  function delegateCallUint256Mock(uint256 _value) public pure returns (uint256) {
    require(_value != 0, "AM02");
    return _value;
  }

  function delegateCallBytesMock(bytes memory _message) public pure returns (bytes memory) {
    require(_message.length > 0, "AM03");
    return _message;
  }
}
