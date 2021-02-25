pragma solidity ^0.8.0;


/**
 * @title IFactory
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 **/
abstract contract IFactory {

  function blueprint(uint256 _id) virtual public view returns (
    address _template, bytes memory bytecode, bytes memory defaultParameters);

  function defineBlueprint(
    uint256 _id,
    address _template,
    bytes memory _bytecode,
    bytes memory _defaultParameters) virtual public returns (bool);
  function deployContract(uint256 _id, bytes memory _parameters)
    virtual public returns (address);

  event BlueprintDefined(uint256 contractId, bytes32 codeHash);
  event ContractDeployed(uint256 contractId, address address_);
}
