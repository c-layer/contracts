pragma solidity ^0.8.0;


/**
 * @title DelegateCallView
 * @dev Calls delegates for view and non view functions
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error Messages:
 *   DV01: Cannot call forwardCallBytes directly
 **/
contract DelegateCallView {

  bytes4 internal constant FORWARD_CALL_BYTES = bytes4(keccak256("forwardCallBytes(address,bytes)"));

  function _delegateCallBool(address _delegate)
    internal view returns (bool)
  {
    return abi.decode(_delegateCallBytes(_delegate), (bool));
  }

  function _delegateCallUint256(address _delegate)
    internal view returns (uint256)
  {
    return abi.decode(_delegateCallBytes(_delegate), (uint256));
  }

  function _delegateCallBytes(address _delegate)
    internal view returns (bytes memory result)
  {
    bool status;
    (status, result) = address(this).staticcall(
      abi.encodeWithSelector(FORWARD_CALL_BYTES, _delegate, msg.data));
    require(status, string(result));
    result = abi.decode(result, (bytes));
  }

  /**
   * @dev enforce static immutability (view)
   * @dev in order to read delegate value through internal delegateCall
   */
  function forwardCallBytes(address _delegate, bytes memory _data)
    public returns (bytes memory result)
  {
    require(msg.sender == address(this), "DV01");
    bool status;
    // solhint-disable-next-line avoid-low-level-calls
    (status, result) = _delegate.delegatecall(_data);
    require(status, string(result));
  }
}
