pragma solidity ^0.6.0;

import "@c-layer/common/contracts/operable/Ownable.sol";
import "./interface/IWrappedERC20.sol";
import "./interface/IBatchTransferERC20.sol";


/**
 * @title BatchTransferERC20
 * @dev Batch transfer ERC20
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   BT01: Not enought fees provided
 *   BT02: Unable to process the fees
 *   BT03: Inconsistent number of addresses and amounts
 *   BT04: Unable to transfer tokens
 *   BT05: Cannot send fees to the null address
 */
contract BatchTransferERC20 is IBatchTransferERC20, Ownable {

  address payable internal vaultETH_;
  uint256 internal feesRate_;

  modifier withFees {
    uint256 fees = gasleft() * tx.gasprice * feesRate_ / 1000000;
    require(msg.value >= fees, "BT01");
    require(vaultETH_.send(fees), "BT02");
    _;
  }

  function estimateTransferFees() public view returns (uint256) {
    return gasleft() * tx.gasprice * feesRate_ / 1000000;
  }

  constructor(address payable _vaultETH, uint256 _feesRate) public {
    updateFeesInternal(_vaultETH, _feesRate);
  }

  function vaultETH() external override view returns (address) {
    return vaultETH_;
  }

  function feesRate() external override view returns (uint256) {
    return feesRate_;
  }

  function transfer(
    address _token,
    address[] memory _addresses,
    uint256[] memory _amounts)
    external override payable withFees returns (bool)
  {
    require(_addresses.length == _amounts.length, "BT03");
    for(uint256 i = 0; i < _addresses.length; i++) {
      require(IERC20(_token).transferFrom(msg.sender, _addresses[i], _amounts[i]), "BT04");
    }

    return true;
  }

  function updateFees(address payable _vaultETH, uint256 _feesRate)
    external override onlyOwner returns (bool)
  {
    updateFeesInternal(_vaultETH, _feesRate);
    return true;
  }

  function updateFeesInternal(address payable _vaultETH, uint256 _feesRate) internal
  {
    require(_feesRate == 0 || _vaultETH != address(0), "BT05");
    vaultETH_ = _vaultETH;
    feesRate_ = _feesRate;
    emit FeesUpdate(_vaultETH, _feesRate);
  }
}
