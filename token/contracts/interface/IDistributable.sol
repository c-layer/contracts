pragma solidity ^0.8.0;


/**
 * @title IDistributable interface
 *
 * SPDX-License-Identifier: MIT
 */
interface IDistributable {

  function distribute(address _from, address[] calldata _tos, uint256[] calldata _values)
    external returns (bool);
}
