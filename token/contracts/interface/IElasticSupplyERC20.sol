pragma solidity ^0.6.0;


/**
 * @title IElasticSupplyERC20 interface
 *
 * SPDX-License-Identifier: MIT
 */
abstract contract IElasticSupplyERC20 {

  event ElasticityUpdate(uint256 value);

  function elasticity() public virtual view returns (uint256);
  function defineElasticity(uint256 _elasticity) external virtual returns (bool);
}
