pragma solidity >=0.5.0 <0.6.0;

import "../TokenStorage.sol";
import "../TokenProxy.sol";


/**
 * @title Base Token Delegate
 * @dev Base Token Delegate
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * TD01: Recipient must not be null
 * TD02: Not enougth tokens
 * TD03: Transfer event must be generated
 * TD04: Allowance limit reached
 */
contract BaseTokenDelegate is TokenStorage {

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

  /**
   * @dev Overriden transfer function
   */
  function transfer(address _sender, address _receiver, uint256 _value)
    public returns (bool)
  {
    return transferInternal(
      transferData(msg.sender, address(0), _sender, _receiver, _value));
  }

  /**
   * @dev Overriden transferFrom function
   */
  function transferFrom(
    address _caller, address _sender, address _receiver, uint256 _value)
    public returns (bool)
  {
    return transferInternal(
      transferData(msg.sender, _caller, _sender, _receiver, _value));
  }

  /**
   * @dev can transfer
   */
  function canTransfer(
    address _sender,
    address _receiver,
    uint256 _value) public view returns (TransferCode)
  {
    return canTransferInternal(
      transferData(msg.sender, address(0), _sender, _receiver, _value));
  }

  /**
   * @dev approve
   */
  function approve(address _sender, address _spender, uint256 _value)
    public returns (bool)
  {
    TokenData storage token = tokens[msg.sender];
    token.allowed[_sender][_spender] = _value;
    require(
      TokenProxy(msg.sender).emitApproval(_sender, _spender, _value),
      "TD03");
    return true;
  }

  /**
   * @dev increase approval
   */
  function increaseApproval(address _sender, address _spender, uint _addedValue)
    public returns (bool)
  {
    TokenData storage token = tokens[msg.sender];
    token.allowed[_sender][_spender] = (
      token.allowed[_sender][_spender].add(_addedValue));
    require(
      TokenProxy(msg.sender).emitApproval(_sender, _spender, token.allowed[_sender][_spender]),
      "TD03");
    return true;
  }

  /**
   * @dev decrease approval
   */
  function decreaseApproval(address _sender, address _spender, uint _subtractedValue)
    public returns (bool)
  {
    TokenData storage token = tokens[msg.sender];
    uint oldValue = token.allowed[_sender][_spender];
    if (_subtractedValue > oldValue) {
      token.allowed[_sender][_spender] = 0;
    } else {
      token.allowed[_sender][_spender] = oldValue.sub(_subtractedValue);
    }
    require(
      TokenProxy(msg.sender).emitApproval(_sender, _spender, token.allowed[_sender][_spender]),
      "TD03");
    return true;
  }

  /**
   * @dev transfer
   */
  function transferInternal(TransferData memory _transferData) internal returns (bool)
  {
    TokenData storage token = tokens[_transferData.token];
    address caller = _transferData.caller;
    address sender = _transferData.sender;
    address receiver = _transferData.receiver;
    uint256 value = _transferData.value;

    require(sender != address(0), "TD01");
    require(value <= token.balances[sender], "TD02");

    if (caller != address(0)
      && (selfManaged[sender]
        || !hasProxyPrivilege(caller, _transferData.token, msg.sig)))
    {
      require(value <= token.allowed[sender][caller], "TD04");
      token.allowed[sender][caller] = token.allowed[sender][caller].sub(value);
    }

    token.balances[sender] = token.balances[sender].sub(value);
    token.balances[receiver] = token.balances[receiver].add(value);
    require(
      TokenProxy(msg.sender).emitTransfer(sender, receiver, value),
      "TD03");
    return true;
  }

  /**
   * @dev can transfer
   */
  function canTransferInternal(TransferData memory _transferData)
    internal view returns (TransferCode)
  {
    TokenData storage token = tokens[_transferData.token];
    address sender = _transferData.sender;
    address receiver = _transferData.receiver;
    uint256 value = _transferData.value;

    if (sender == address(0)) {
      return TransferCode.INVALID_SENDER;
    }

    if (receiver == address(0)) {
      return TransferCode.NO_RECIPIENT;
    }

    if (value > token.balances[sender]) {
      return TransferCode.INSUFFICIENT_TOKENS;
    }

    return TransferCode.OK;
  }

  /**
   * @dev transferData
   */
  function transferData(
    address _token, address _caller,
    address _sender, address _receiver, uint256 _value)
    internal view returns (TransferData memory)
  {
    // silence state mutability warning without generating bytecode
    // see https://github.com/ethereum/solidity/issues/2691
    this;

    uint256[] memory emptyArray = new uint256[](0);
    return TransferData(
        _token,
        _caller,
        _sender,
        _receiver,
        0,
        emptyArray,
        false,
        0,
        emptyArray,
        false,
        0,
        emptyArray,
        false,
        _value,
        0
    );
  }
}
