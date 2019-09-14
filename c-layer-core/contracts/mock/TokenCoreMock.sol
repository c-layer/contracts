pragma solidity >=0.5.0 <0.6.0;

import "../TokenCore.sol";


/**
 * @title TokenCoreMock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * TCM01: invalid token address
 * TCM02: supplies already exist for the token
 **/
contract TokenCoreMock is TokenCore {

  constructor(
    string memory _name,
    address[] memory _delegates)
    // solhint-disable-next-line no-empty-blocks
    public TokenCore(_name, _delegates) {}

  function defineSupply(address _tokenAddress, uint256 _supply)
    public returns (bool)
  {
    require(_tokenAddress != address(0), "TCM01");
    TokenData storage token = tokens_[_tokenAddress];
    require(token.totalSupply == 0, "TCM02");
    token.totalSupply = _supply;
    token.balances[msg.sender] = _supply;
    return true;
  }

  function emitTransfer(
    address _token,
    address _from,
    address _to,
    uint256 _amount) public returns (bool) {
    TokenProxy(_token).emitTransfer(_from, _to, _amount);
  }

  function emitApproval(
    address _token,
    address _owner,
    address _spender,
    uint256 _amount) public returns (bool) {
    TokenProxy(_token).emitApproval(_owner, _spender, _amount);
  }
}
