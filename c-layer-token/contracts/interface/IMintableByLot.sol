pragma solidity >=0.5.0 <0.6.0;

import "./IMintable.sol";


/**
 * @title MintableByLot interface
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */
contract IMintableByLot is IMintable {
  function minterLotId(address _minter) public view returns (uint256);
}
