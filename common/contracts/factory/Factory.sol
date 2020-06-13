pragma solidity ^0.6.0;

import "../convert/BytesConvert.sol";


/**
 * @title Factory
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * FA01: No code was defined 
 * FA02: Unable to deploy contract
 **/
contract Factory {
  using BytesConvert for bytes;

  mapping(uint256 => bytes) internal contractCodes_;

  /**
   * @dev contracctCode
   */
  function contractCode(uint256 _id) public view returns (bytes memory) {
    return contractCodes_[_id];
  }

  /**
   * @dev defineContractCodeInternal
   */
  function defineCodeInternal(
    uint256 _id,
    bytes memory _contractCode) internal returns (bool)
  {
    contractCodes_[_id] = _contractCode;
    emit ContractCodeDefined(_id, keccak256(_contractCode));
    return true;
  }

  /**
   * @dev deployContractInternal
   */
  function deployContractInternal(
    uint256 _id,
    bytes memory _parameters) internal returns (address address_)
  {
    require(contractCodes_[_id].length != 0, "FA01");
    bytes memory code = abi.encodePacked(contractCodes_[_id], _parameters);
    // solhint-disable-next-line no-inline-assembly
    assembly {
      address_ := create(0, add(code, 0x20), mload(code))
    }
    require(address_ != address(0), "FA02");
    emit ContractDeployed(_id, address_);
  }

  event ContractCodeDefined(uint256 contractId, bytes32 codeHash);
  event ContractDeployed(uint256 contractId, address address_);
}
