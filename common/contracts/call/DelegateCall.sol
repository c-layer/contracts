pragma solidity ^0.8.0;


/**
 * @title DelegateCall
 * @dev Calls delegates for non view functions only
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error Messages:
 **/
library DelegateCall {

  function _delegateCall(address _delegate) internal returns (bool status)
  {
    bytes memory result;
    // solhint-disable-next-line avoid-low-level-calls
    (status, result) = _delegate.delegatecall(msg.data);
    require(status, string(result));
  }

  function _delegateCallBool(address _delegate) internal returns (bool status)
  {
    return abi.decode(_delegateCallBytes(_delegate), (bool));
  }

  function _delegateCallUint256(address _delegate) internal returns (uint256)
  {
    return abi.decode(_delegateCallBytes(_delegate), (uint256));
  }

  function _delegateCallBytes(address _delegate)
    internal returns (bytes memory result)
  {
    bool status;
    // solhint-disable-next-line avoid-low-level-calls
    (status, result) = _delegate.delegatecall(msg.data);
    require(status, string(result));
  }
}
