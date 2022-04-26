pragma solidity ^0.8.0;


/**
 * @title ISignableERC20 interface
 *
 * SPDX-License-Identifier: MIT
 */
interface ISignableERC20 {
  event OperatorsDefined(address[] operators);
  event Signature(address signer, address signee, bytes32 hash);

  function transferFromWithSignature(
    address _from,
    address _to,
    uint256 _value,
    uint64 _signatureValidity,
    bytes memory _signature) external returns (bool);
}
