pragma solidity >=0.5.0 <0.6.0;

import "../core/BaseTokenCore.sol";


/**
 * @title BaseTokenCoreMock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * BTCM01: invalid token address
 * BTCM02: supplies already exist for the token
 **/
contract BaseTokenCoreMock is BaseTokenCore {

  function defineSupply(address _tokenAddress, uint256 _supply)
    public returns (bool)
  {
    require(_tokenAddress != address(0), "BTCM01");
    BaseTokenData storage token = baseTokens[_tokenAddress];
    require(token.totalSupply == 0, "BTCM02");
    token.totalSupply =  _supply;
    token.balances[msg.sender] = _supply;
    return true;
  }
}
