pragma solidity ^0.6.0;

import "../operable/Operable.sol";
import "./Factory.sol";


/**
 * @title Factory
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 **/
contract OperableFactory is Operable, Factory {

  /**
   * @dev defineCode
   */
  function defineCode(uint256 _id, bytes memory _code)
    public onlyOperator returns (bool)
  {
    return defineCodeInternal(_id, _code);
  }

  /**
   * @dev deployContract
   */
  function deployContract(uint256 _id, bytes memory _parameters)
    public onlyOperator returns (address)
  {
    return deployContractInternal(_id, _parameters);
  }
}
