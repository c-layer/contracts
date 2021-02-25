pragma solidity ^0.8.0;

import "@c-layer/common/contracts/core/OperableProxy.sol";
import "./interface/ITokenProxy.sol";
import "./TokenCore.sol";


/**
 * @title Token proxy
 * @dev Token proxy default implementation
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 */
contract TokenProxy is ITokenProxy, OperableProxy {

  // solhint-disable-next-line no-empty-blocks
  constructor(address _core) OperableProxy(_core) { }

  function name() override public view returns (string memory) {
    return TokenCore(core).tokenName();
  }

  function symbol() override public view returns (string memory) {
    return TokenCore(core).tokenSymbol();
  }

  function decimals() override public view returns (uint256) {
    return staticCallUint256();
  }

  function totalSupply() override public view returns (uint256) {
    return staticCallUint256();
  }

  function balanceOf(address) override public view returns (uint256) {
    return staticCallUint256();
  }

  function allowance(address, address)
    override public view returns (uint256)
  {
    return staticCallUint256();
  }

  function transfer(address _to, uint256 _value) override public returns (bool status)
  {
    return TokenCore(core).transfer(msg.sender, _to, _value);
  }

  function transferFrom(address _from, address _to, uint256 _value)
    override public returns (bool status)
  {
    return TokenCore(core).transferFrom(msg.sender, _from, _to, _value);
  }

  function approve(address _spender, uint256 _value)
    override public returns (bool status)
  {
    return TokenCore(core).approve(msg.sender, _spender, _value);
  }

  function increaseApproval(address _spender, uint256 _addedValue)
    override public returns (bool status)
  {
    return TokenCore(core).increaseApproval(msg.sender, _spender, _addedValue);
  }

  function decreaseApproval(address _spender, uint256 _subtractedValue)
    override public returns (bool status)
  {
    return TokenCore(core).decreaseApproval(msg.sender, _spender, _subtractedValue);
  }

  function canTransfer(address, address, uint256)
    override public view returns (uint256)
  {
    return staticCallUint256();
  }

  function emitTransfer(address _from, address _to, uint256 _value)
    override public onlyCore returns (bool)
  {
    emit Transfer(_from, _to, _value);
    return true;
  }

  function emitApproval(address _owner, address _spender, uint256 _value)
    override public onlyCore returns (bool)
  {
    emit Approval(_owner, _spender, _value);
    return true;
  }
}
