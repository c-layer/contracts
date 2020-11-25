pragma solidity ^0.6.0;

import "../operable/Operable.sol";
import "./Factory.sol";


/**
 * @title IOperableFactory
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 **/
contract OperableFactory is Factory, Operable {

  /**
   * @dev defineBlueprint
   */
  function defineBlueprint(
    uint256 _id,
    address _template,
    bytes memory _bytecode,
    bytes memory _defaultParameters) override public onlyOperator returns (bool)
  {
    return defineBlueprintInternal(_id, _template, _bytecode, _defaultParameters);
  }

  /**
   * @dev deployContract
   */
  function deployContract(uint256 _id, bytes memory _parameters)
    public override returns (address)
  {
    return deployContractInternal(_id, _parameters);
  }
}
