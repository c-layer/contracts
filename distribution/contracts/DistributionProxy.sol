pragma solidity ^0.6.0;

import "@c-layer/common/contracts/core/OperableProxy.sol";
import "./interface/IDistributionProxy.sol";
import "./interface/IDistributionCore.sol";


/**
 * @title DistributionProxy
 * @dev DistributionProxy contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * DP01: ETH must be successfully transferred
 * DP02: Deposit operation must be successful
 * DP03: Ether must be received
 * DP04: No ETH provided
 * DP05: Unable to transfer funds
*/
contract DistributionProxy is IDistributionProxy, OperableProxy {

  // solhint-disable-next-line no-empty-blocks
  constructor(address _core) public OperableProxy(_core) { }

  /**
   * @dev receive
   */
  receive() external override payable {
    require(msg.value > 0, "DP01");
    IDistributionCore distributionCore = IDistributionCore(core);

    (, IVault vault, IERC20 token) = distributionCore.distribution(msg.sender);
    require(token == ETHER, "DP03");

    // FIXME: Ether might be transferred by the code fail after that
    // solhint-disable-next-line avoid-call-value, avoid-low-level-calls
    (bool success,) = address(vault).call{ value: msg.value }("");

    require(success, "DP01");
    require(distributionCore.deposit(msg.sender, msg.value), "DP02");
  }

  /**
   * @dev deposit
   */
  function deposit(uint256 _value) public override returns (bool) {
    IDistributionCore distributionCore = IDistributionCore(core);

    require(_value > 0, "DP01");
    (, IVault vault, IERC20 token) = distributionCore.distribution(msg.sender);

    // ETH must be received through the receive function
    require(token != ETHER, "DP04");

    require(token.transferFrom(msg.sender, address(vault), _value), "DP05");
    return distributionCore.deposit(msg.sender, _value);
  }

  /**
   * @dev withdraw
   */
  function withdraw(uint256 _value) public override returns (bool)
  {
    IDistributionCore distributionCore = IDistributionCore(core);
    return distributionCore.withdraw(msg.sender, _value);
  }
}
