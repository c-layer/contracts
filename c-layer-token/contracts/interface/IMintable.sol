pragma solidity >=0.5.0 <0.6.0;


/**
 * @title Mintable interface
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */
contract IMintable {
  function mintingFinished() public view returns (bool);

  function mint(address _to, uint256 _amount) public returns (bool);
  function finishMinting() public returns (bool);
 
  event Mint(address indexed to, uint256 amount);
  event MintFinished();
}
