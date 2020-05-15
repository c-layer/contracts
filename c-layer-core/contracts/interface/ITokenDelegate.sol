pragma solidity >=0.5.0 <0.6.0;

import "../interface/ITokenStorage.sol";


/**
 * @title Token Delegate Interface
 * @dev Token Delegate Interface
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 */
contract ITokenDelegate is ITokenStorage {

  struct TransferData {
    address token;
    address caller;
    address sender;
    address receiver;

    uint256 callerId;
    uint256[] callerKeys;
    bool callerFetched;

    uint256 senderId;
    uint256[] senderKeys;
    bool senderFetched;

    uint256 receiverId;
    uint256[] receiverKeys;
    bool receiverFetched;

    uint256 value;
    uint256 convertedValue;
  }

  function decimals() public view returns (uint256);
  function totalSupply() public view returns (uint256);
  function balanceOf(address _owner) public view returns (uint256);
  function allowance(address _owner, address _spender)
    public view returns (uint256);
  function transfer(address _sender, address _receiver, uint256 _value)
    public returns (bool);
  function transferFrom(
    address _caller, address _sender, address _receiver, uint256 _value)
    public returns (bool);
  function canTransfer(
    address _sender,
    address _receiver,
    uint256 _value) public view returns (TransferCode);
  function approve(address _sender, address _spender, uint256 _value)
    public returns (bool);
  function increaseApproval(address _sender, address _spender, uint _addedValue)
    public returns (bool);
  function decreaseApproval(address _sender, address _spender, uint _subtractedValue)
    public returns (bool);
  function auditRequirements() public pure returns (uint256);
}
