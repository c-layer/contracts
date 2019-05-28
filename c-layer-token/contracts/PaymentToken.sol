pragma solidity >=0.5.0 <0.6.0;

import "./token/MintableCToken.sol";


/**
 * @title PaymentToken
 * @dev PaymentToken contract
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */
contract PaymentToken is MintableCToken {

  /**
   * @dev constructor
   */
  constructor(string memory _name, string memory _symbol)
    public MintableCToken(_name, _symbol, new IRule[](0))
    {} /* solhint-disable no-empty-blocks */
}

