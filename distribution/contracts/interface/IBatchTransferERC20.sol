pragma solidity ^0.6.0;


/**
 * @title IBatchTransferERC20
 * @dev Batch Transfer ERC20 interface
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
abstract contract IBatchTransferERC20 {

  uint256 internal constant FEES_PRECISION = 1000000;

  event FeesUpdate(address vaultETH, uint256 feesRate);

  enum TransferMode {
    DISTRIBUTE,
    COLLECT
  }

  function vaultETH() external virtual view returns (address);
  function feesRate() external virtual view returns (uint256);

  function transfer(
    address _token,
    address[] memory _addresses,
    uint256[] memory _amounts)
    external virtual payable returns (bool);

  function updateFees(address payable _vaultETH, uint256 _feesRate)
    external virtual returns (bool);

}
