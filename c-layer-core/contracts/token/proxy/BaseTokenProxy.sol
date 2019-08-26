pragma solidity >=0.5.0 <0.6.0;

import "../../Proxy.sol";
import "../interface/IBaseTokenCore.sol";


/**
 * @title BaseToken proxy
 * @dev BaseToken proxy default implementation
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract BaseTokenProxy is Proxy {

  constructor(address _core) Proxy(_core) public { }

  function totalSupply() public view returns (uint256) {
    return IBaseTokenCore(core).totalSupply();
  }

  function balanceOf(address _owner) public view returns (uint256) {
    return IBaseTokenCore(core).balanceOf(_owner);
  }

  function allowance(address _owner, address _spender)
    public view returns (uint256)
  {
    return IBaseTokenCore(core).allowance(_owner, _spender);
  }

  function transfer(address _to, uint256 _value) public returns (bool status)
  {
    status = IBaseTokenCore(core).transfer(msg.sender, _to, _value);

    if (status) {
      emit Transfer(msg.sender, _to, _value);
    }
  }

  function transferFrom(address _from, address _to, uint256 _value)
    public returns (bool status)
  {
    status = IBaseTokenCore(core).transferFrom(msg.sender, _from, _to, _value);

    if (status) {
      emit Transfer(_from, _to, _value);
    }
  }

  function approve(address _spender, uint256 _value)
    public returns (bool status)
  {
    status = IBaseTokenCore(core).approve(msg.sender, _spender, _value);

    if (status) {
      emit Approval(msg.sender, _spender, _value);
    }
  }

  function increaseApproval(address _spender, uint256 _addedValue)
    public returns (bool status)
  {
    status = IBaseTokenCore(core).increaseApproval(msg.sender, _spender, _addedValue);
    if (status) {
      emit Approval(msg.sender, _spender,
        IBaseTokenCore(core).allowance(msg.sender, _spender));
    }
  }

  function decreaseApproval(address _spender, uint256 _subtractedValue)
    public returns (bool status)
  {
    status = IBaseTokenCore(core).decreaseApproval(msg.sender, _spender, _subtractedValue);

    if (status) {
      emit Approval(msg.sender, _spender,
        IBaseTokenCore(core).allowance(msg.sender, _spender));
    }
  }

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(
    address indexed owner,
    address indexed spender,
    uint256 value
  );
}
