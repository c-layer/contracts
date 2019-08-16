pragma solidity >=0.5.0 <0.6.0;


/**
 * @title IOwnable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract IOwnable {

  function owner() public view returns (address);

  event OwnershipRenounced(address indexed previousOwner);
  event OwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner
  );

}
