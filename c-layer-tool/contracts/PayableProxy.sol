pragma solidity >=0.5.0 <0.6.0;

import "./governance/Ownable.sol";


/**
 * @title PayableProxy
 * @dev PayableProxy is a proxy which redirect all incoming transaction
 * to either one account or one payable function of a contract.
 * In the first case, the transaction data will contains the incoming msg.data.
 * In the second case, the payable function will be called with two parameters 
 * the incoming message msg.sender and msg.data
 *
 * To avoid abuse the configuration need to be locked before the redirection is active
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 *
 * Error messages
 * PP01: configuration is locked
 * PP02: configuration has not been locked
 * PP03: redirection is not started yet
 * PP04: redirection has failed
 *
 **/
contract PayableProxy is Ownable {

  // Address of the targeted account contract 
  address payable internal payableAddr_;

  // Encoded abi of the payable function to be called if the target is a contract
  bytes4 internal payableFunction_;

  // Redirection start datetime
  uint256 internal startAt_;

  // Is configuration locked
  bool private configLocked;

  modifier configNotLocked() {
    require(!configLocked, "PP01");
    _;
  }

  constructor(address payable _payableAddr, string memory _payableAbi, uint256 _startAt)
    public
  {
    configure(_payableAddr, _payableAbi, _startAt);
  }

  // solhint-disable-next-line no-complex-fallback
  function () external payable {
    require(configLocked, "PP02");
    // solhint-disable-next-line not-rely-on-time
    require(now > startAt_, "PP03");
    callPayable(msg.value, msg.sender, msg.data);
  }

  function payableAddr() public view returns (address payable) {
    return payableAddr_;
  }

  function payableFunction() public view returns (bytes4) {
    return payableFunction_;
  }

  function startAt() public view returns (uint256) {
    return startAt_;
  }

  function isConfigLocked() public view returns (bool) {
    return configLocked;
  }

  /* @dev configure the proxy with the following parameters
   * @param _payableAddr Address of the  to be redirected to
   * @param _abi ABI of the function to be executed.
   *        Example 'function(address,bytes)'
   * @param _startAt seconds at which the will start redirecting
   *        to the real contract
   */
  function configure(
    address payable _payableAddr,
    string memory _payableAbi,
    uint256 _startAt
    ) public onlyOwner configNotLocked
  {
    payableAddr_ = _payableAddr;
    payableFunction_ = bytes4(keccak256(abi.encodePacked(_payableAbi)));
    startAt_ = _startAt;

    emit NewConfig(_payableAddr, _payableAbi, _startAt);
  }

  /* @dev Lock the configuration
   */
  function lockConfig() public onlyOwner configNotLocked {
    dryRun();
    configLocked = true;
    emit ConfigLocked();
  }

  /*
   * @dev Allow to quick check the configuration
   * while the configuration is still unlocked
   */
  function dryRun() public {
    callPayable(0, msg.sender, "test");
  }

  /*
   * @dev Send the received ETH to the configured and locked contract address
   * The call can be done only when the redirection has started
   */
  function callPayable(uint256 _value, address _sender, bytes memory _data)
    internal
  {
    bytes memory encodedData =  abi.encodePacked(payableFunction_, _sender, _data);
    // solhint-disable-next-line avoid-call-value
    (bool success,) = payableAddr_.call.value(_value)(encodedData);
    require(success, "PP04");
  }

  event NewConfig(address payableAddr, string payableAbi, uint256 startAt);
  event ConfigLocked();
}
