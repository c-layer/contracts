pragma solidity >=0.5.0 <0.6.0;


/**
 * @title IERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 * @dev see https://github.com/ethereum/EIPs/issues/179
 */
contract IERC20 {
  function name() public view returns (string memory);
  function symbol() public view returns (string memory);
  function decimal() public view returns (uint256);
  function totalSupply() public view returns (uint256);
  function balanceOf(address who) public view returns (uint256);
  function transfer(address to, uint256 value) public returns (bool);

  function allowance(address owner, address spender)
    public view returns (uint256);

  function transferFrom(address from, address to, uint256 value)
    public returns (bool);

  function approve(address spender, uint256 value) public returns (bool);

  function increaseApproval(address spender, uint addedValue)
    public returns (bool);

  function decreaseApproval(address spender, uint subtractedValue)
    public returns (bool);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(
    address indexed owner,
    address indexed spender,
    uint256 value
  );
}
