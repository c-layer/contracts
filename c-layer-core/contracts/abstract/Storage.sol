pragma solidity >=0.5.0 <0.6.0;


/**
 * @title Storage
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 **/
contract Storage {

  mapping(address => uint256) public proxyDelegateIds;
  mapping(uint256 => address) public delegates;
}
