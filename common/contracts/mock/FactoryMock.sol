pragma solidity ^0.6.0;

import "../factory/Factory.sol";


/**
 * @title FactoryMock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 **/
contract FactoryMock is Factory {

  /**
   * @dev constructor
   */
  constructor() public Factory() {}

  /**
   * @dev runtime
   */
  function runtime(uint256 _id)
    public view returns (bytes memory code)
  {
    return runtimeInternal(_id);
  }

  /**
   * @dev readBytecode
   */
  function readyBytecode(address _address)
    public view returns (bytes memory code)
  {
    return readBytecodeInternal(_address);
  }

  /**
   * @dev define blueprint
   */
  function defineBlueprint(
    uint256 _id,
    address _template,
    bytes memory _bytecode,
    bytes memory _defaultParameters)
    override public returns (bool)
  {
    return defineBlueprintInternal(
      _id, _template, _bytecode, _defaultParameters);
  }

  /**
   * @dev deploy contract
   */
  function deployContract(uint256 _id, bytes memory _parameters)
    override public returns (address)
  {
    return deployContractInternal(_id, _parameters);
  }
}
