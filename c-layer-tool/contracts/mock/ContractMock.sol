pragma solidity >=0.5.0 <0.6.0;


/**
 * @title ContractMock
 * @dev ContractMock allows testing of contract interacting
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */
contract ContractMock {

  function () external payable {
    emit LogMsg(
      msg.sender,
      tx.origin, // solhint-disable-line avoid-tx-origin
      msg.value,
      msg.data
    );
  }

  function testMe() external payable returns (bool) {
    emit LogFuncCall(
      "testMe",
      msg.sender,
      msg.value,
      msg.data);
  }

  function testMeWithParams(address _address, bytes calldata  _data)
    external payable returns (bool)
  {
    emit LogFuncCall(
      "testMeWithParams",
      msg.sender,
      uint256(_address),
      _data);
  }

  function throwMe() external payable returns (bool) {
    assert(false);
  }

  function revertMe() external payable returns (bool) {
    revert("Reverting !");
  }

  function computeMe(uint256 /*_max*/) external payable returns (bool) {
    //for (uint i = 0; i < _max; i++) {}
    emit LogFuncCall(
      "computeMe",
      msg.sender,
      msg.value,
      msg.data
    );
  }

  event LogMsg(address sender, address origin, uint256 value, bytes data);
  event LogFuncCall(string funcName, address sender, uint256 value,
  bytes data);
}
