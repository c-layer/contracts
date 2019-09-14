pragma solidity >=0.5.0 <0.6.0;

import "./operable/OperableProxy.sol";
import "./TokenCore.sol";
import "./interface/IERC20.sol";


/**
 * @title Token proxy
 * @dev Token proxy default implementation
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract TokenProxy is IERC20, OperableProxy {

  // solhint-disable-next-line no-empty-blocks
  constructor(address _core) public OperableProxy(_core) { }

  function name() public view returns (string memory) {
    return TokenCore(core).tokenName();
  }

  function symbol() public view returns (string memory) {
    return TokenCore(core).tokenSymbol();
  }

  function decimals() public view returns (uint256) {
    return TokenCore(core).tokenDecimals();
  }

  function totalSupply() public view returns (uint256) {
    return TokenCore(core).tokenTotalSupply();
  }

  function balanceOf(address _owner) public view returns (uint256) {
    return TokenCore(core).tokenBalanceOf(_owner);
  }

  function allowance(address _owner, address _spender)
    public view returns (uint256)
  {
    return TokenCore(core).tokenAllowance(_owner, _spender);
  }

  function transfer(address _to, uint256 _value) public returns (bool status)
  {
    return TokenCore(core).transfer(msg.sender, _to, _value);
  }

  function transferFrom(address _from, address _to, uint256 _value)
    public returns (bool status)
  {
    return TokenCore(core).transferFrom(msg.sender, _from, _to, _value);
  }

  function approve(address _spender, uint256 _value)
    public returns (bool status)
  {
    return TokenCore(core).approve(msg.sender, _spender, _value);
  }

  function increaseApproval(address _spender, uint256 _addedValue)
    public returns (bool status)
  {
    return TokenCore(core).increaseApproval(msg.sender, _spender, _addedValue);
  }

  function decreaseApproval(address _spender, uint256 _subtractedValue)
    public returns (bool status)
  {
    return TokenCore(core).decreaseApproval(msg.sender, _spender, _subtractedValue);
  }

  function canTransfer(address _from, address _to, uint256 _value)
    public returns (uint256)
  {
    return TokenCore(core).canTransfer(_from, _to, _value);
  }

  function emitTransfer(address _from, address _to, uint256 _value)
    public onlyCore returns (bool)
  {
    emit Transfer(_from, _to, _value);
    return true;
  }

  function emitApproval(address _owner, address _spender, uint256 _value)
    public onlyCore returns (bool)
  {
    emit Approval(_owner, _spender, _value);
    return true;
  }

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(
    address indexed owner,
    address indexed spender,
    uint256 value
  );
}
