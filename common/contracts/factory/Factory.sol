pragma solidity ^0.8.0;

import "../convert/BytesConvert.sol";
import "../interface/IFactory.sol";


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
abstract contract Factory is IFactory {
  using BytesConvert for bytes;

  struct Blueprint {
    address template;
    bytes bytecode;
    bytes defaultParameters;
  }

  mapping(uint256 => Blueprint) internal blueprints;

  /**
   * @dev blueprint
   */
  function blueprint(uint256 _id) override public view returns (
    address _template, bytes memory bytecode, bytes memory defaultParameters)
  {
    Blueprint memory blueprint_ = blueprints[_id];
    return (
      blueprint_.template,
      blueprint_.bytecode,
      blueprint_.defaultParameters);
  }

  /**
   * @dev defineBlueprintInternal
   */
  function defineBlueprintInternal(
    uint256 _id,
    address _template,
    bytes memory _bytecode,
    bytes memory _defaultParameters) internal returns (bool)
  {
    blueprints[_id] =
      Blueprint(_template, _bytecode, _defaultParameters);

    emit BlueprintDefined(_id, keccak256(runtimeInternal(_id)));
    return true;
  }

  /**
   * @dev deployContractInternal
   */
  function deployContractInternal(
    uint256 _id,
    bytes memory _parameters) internal returns (address address_)
  {
    bytes memory bytecode = runtimeInternal(_id);
    require(bytecode.length != 0, "FA01");

    bytecode = abi.encodePacked(bytecode,
      ((_parameters.length == 0) ? blueprints[_id].defaultParameters : _parameters));

    // solhint-disable-next-line no-inline-assembly
    assembly {
      address_ := create(0, add(bytecode, 0x20), mload(bytecode))
    }
    require(address_ != address(0), "FA02");
    emit ContractDeployed(_id, address_);
  }

  /**
   * @dev runtimeInternal
   */
  function runtimeInternal(uint256 _id) internal view returns (bytes memory runtime) {
    Blueprint memory blueprint_ = blueprints[_id];
    return (blueprint_.template != address(0)) ?
      abi.encodePacked(
        blueprint_.bytecode,
        readBytecodeInternal(blueprint_.template)
      ) : blueprint_.bytecode;
  }

  /**
   * @dev readBytecodeInternal
   */
  function readBytecodeInternal(address _address) internal view returns (bytes memory bytecode) {
    // solhint-disable-next-line no-inline-assembly
    assembly {
      // retrieve the size of the code, this needs assembly
      let size := extcodesize(_address)
      // initialize variable
      bytecode := mload(0x40)
      // new "memory end" including padding
      mstore(0x40, add(bytecode, and(add(add(size, 0x20), 0x1f), not(0x1f))))
      // store length in memory
      mstore(bytecode, size)
      // actually retrieve the code, this needs assembly
      extcodecopy(_address, add(bytecode, 0x20), 0, size)
    }
  }
}
