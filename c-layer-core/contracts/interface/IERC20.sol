pragma solidity >=0.5.0 <0.6.0;


/**
 * @title ERC20 interface
 * @dev ERC20 interface
 */
contract IERC20 {

  function name() public view returns (string memory);
  function symbol() public view returns (string memory);
  function decimals() public view returns (uint256);

  function totalSupply() public view returns (uint256);
  function balanceOf(address _owner) public view returns (uint256);
  function allowance(address _owner, address _spender)
    public view returns (uint256);
  function transfer(address _to, uint256 _value) public returns (bool);
  function transferFrom(address _from, address _to, uint256 _value)
    public returns (bool);
  function approve(address _spender, uint256 _value) public returns (bool);
  function increaseApproval(address _spender, uint _addedValue)
    public returns (bool);
  function decreaseApproval(address _spender, uint _subtractedValue)
    public returns (bool);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(
    address indexed owner,
    address indexed spender,
    uint256 value
  );

}
