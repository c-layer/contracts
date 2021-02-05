pragma solidity ^0.6.0;

import "@c-layer/common/contracts/interface/IERC20.sol";


/**
 * @title IBatchTransfer
 * @dev Batch Transfer  interface
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
abstract contract IBatchTransfer {

  event VaultUpdate(address vaultETH);
  event FeesRateUpdate(bytes4 method, uint256 feesRate);

  function vaultETH() external virtual view returns (address);
  function feesRate(bytes4 _method) external virtual view returns (uint256);

  function transfer(
    address payable[] memory _addresses,
    uint256[] memory _values,
    uint256 _perCallGasLimit)
    external virtual payable returns (bool);

  function transferERC20(
    IERC20 _token,
    address[] memory _addresses,
    uint256[] memory _values)
    external virtual payable returns (bool);
  
  function transferERC20Operator(
    IERC20 _token,
    address _sender,
    address[] calldata _addresses,
    uint256[] calldata _values)
    external virtual returns (bool);

  function updateFeesRates(address payable _vaultETH, bytes4[] calldata _methods, uint256[] calldata _feesRates)
    external virtual returns (bool);

}
