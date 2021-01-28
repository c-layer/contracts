pragma solidity ^0.6.0;

import "./MintableTokenERC20.sol";
import "@c-layer/common/contracts/operable/Ownable.sol";
import "../interface/IElasticSupplyERC20.sol";


/**
 * @title ElasticSupplyERC20
 * @dev Token ERC20 with an elastic supply
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   ES01: Elasticity cannot be 0
 *   ES02: Address is invalid
 *   ES03: Approval too low
 *   ES04: Not enougth tokens
*/
contract ElasticSupplyERC20 is IElasticSupplyERC20, Ownable, MintableTokenERC20 {

  uint256 internal constant ELASTICITY_PRECISION = 10**9;
  uint256 internal elasticity_ = ELASTICITY_PRECISION;

  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    address _initialAccount,
    uint256 _initialSupply
  ) public MintableTokenERC20(_name, _symbol, _decimals, _initialAccount, _initialSupply) {
  }

  function totalSupply() external override view returns (uint256) {
    return totalSupply_.mul(elasticity()).div(ELASTICITY_PRECISION);
  }

  function balanceOf(address _owner) external override view returns (uint256) {
    return balances[_owner].mul(elasticity()).div(ELASTICITY_PRECISION);
  }

  function elasticity() public override virtual view returns (uint256) {
    return elasticity_;
  }

  function defineElasticity(uint256 _elasticity) external override onlyOwner returns (bool) {
    require(_elasticity.div(ELASTICITY_PRECISION) != 0, "ES01");
    elasticity_ = _elasticity;
    emit ElasticityUpdate(_elasticity);
    return true;
  }

  function transferFromInternal(address _from, address _to, uint256 _value)
    internal override virtual returns (bool)
  {
    require(_to != address(0), "ES02");

    if(_from != msg.sender) {
      require(_from == msg.sender || _value <= allowed[_from][msg.sender], "ES03");
      allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
    }

    uint256 currentElasticity = elasticity();
    uint256 baseValue = _value.mul(ELASTICITY_PRECISION).div(currentElasticity);

    require(baseValue <= balances[_from], "ES04");
    balances[_from] = balances[_from].sub(baseValue);
    balances[_to] = balances[_to].add(baseValue);

    emit Transfer(_from, _to, _value);
    return true;
  }
}
