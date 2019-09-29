pragma solidity >=0.5.0 <0.6.0;

import "../TokenCore.sol";


/**
 * @title TokenCoreMock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 **/
contract TokenCoreMock is TokenCore {

  constructor(
    string memory _name, address[] memory _delegates)
    // solhint-disable-next-line no-empty-blocks
    public TokenCore(_name, _delegates) {}

  function defineSupplyMock(address _tokenAddress, uint256 _supply)
    public returns (bool)
  {
    TokenData storage token = tokens_[_tokenAddress];
    token.totalSupply = _supply;
    token.balances[msg.sender] = _supply;
    return true;
  }

  /**
   * @dev Update audit data
   */
  function updateAuditMock(
    address _token,
    address[] memory, uint256[] memory,
    uint256[] memory, uint256[] memory, uint256[] memory,
    uint256[] memory, uint256[] memory) public returns (bool)
  {
    return delegateCall(_token);
  }

  function emitTransferMock(
    address _token,
    address _from,
    address _to,
    uint256 _amount) public returns (bool) {
    TokenProxy(_token).emitTransfer(_from, _to, _amount);
  }

  function emitApprovalMock(
    address _token,
    address _owner,
    address _spender,
    uint256 _amount) public returns (bool) {
    TokenProxy(_token).emitApproval(_owner, _spender, _amount);
  }

  function removeProxyMock(address _proxy)
    internal returns (bool)
  {
    return removeProxy(_proxy);
  }
}
