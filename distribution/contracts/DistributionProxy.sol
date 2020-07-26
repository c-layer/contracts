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
 * DP03: No ETH provided
 * DP04: Unable to transfer funds
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
    IVault vault = distributionCore.vault();
    (bool success,) = address(vault).call{ value: msg.value }("");
    require(success, "DP01");
    require(distributionCore.deposit(ETHER, msg.sender, msg.value), "DP02");
  }

  /**
   * @dev deposit
   */
  function deposit(IERC20 _token, uint256 _value) public override returns (bool) {
    IDistributionCore distributionCore = IDistributionCore(core);

    // ETH must be received through the receive function
    require(_token != ETHER, "DP03");

    require(_value > 0, "DP01");
    IVault vault = distributionCore.vault();
    require(_token.transferFrom(msg.sender, address(vault), _value), "DP04");
    return distributionCore.deposit(_token, msg.sender, _value);
  }

  /**
   * @dev withdraw
   */
  function withdraw(IERC20 _token, uint256 _value) public override returns (bool)
  {
    IDistributionCore distributionCore = IDistributionCore(core);
    return distributionCore.withdraw(_token, msg.sender, _value);
  }
}
