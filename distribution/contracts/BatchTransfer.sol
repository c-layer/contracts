pragma solidity ^0.6.0;

import "@c-layer/common/contracts/operable/Operable.sol";
import "./interface/IBatchTransfer.sol";


/**
 * @title BatchTransfer
 * @dev Batch execution
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   BT01: Unable to process the feesRates payment
 *   BT02: Invalid token address
 *   BT03: Inconsistent number of addresses and values
 *   BT04: Insufficient tokens balance or allowance to distribute these tokens
 *   BT05: Unable to process tokens transfers
 *   BT06: Insufficient ethers provided to distribute these ethers
 *   BT07: Unable to process ether transfers
 *   BT08: Vault must be defined
 *   BT09: Inconsistent methods and feesRates values
 */
contract BatchTransfer is IBatchTransfer, Operable {

  address payable internal vaultETH_;
  mapping(bytes4 => uint256) internal feesRates;

  modifier withFees(uint256 _weight) {
    // As long as feesRates is reasonable, it will not overflow
    uint256 fees = _weight * tx.gasprice * feesRates[msg.sig];

    uint256 transferValue = address(this).balance + fees - msg.value;
    if (transferValue != 0) {
      // solhint-disable-next-line check-send-result
      require(vaultETH_.send(transferValue), "BT01");
    }
    _;
  }

  /**
   * @dev constructor
   */
  constructor(address payable _vaultETH, bytes4[] memory _methods, uint256[] memory _feesRates) public {
    updateFeesRates(_vaultETH, _methods, _feesRates);
  }

  /**
   * @dev vault ETH
   */
  function vaultETH() external override view returns (address) {
    return vaultETH_;
  }

  /**
   * @dev fees rate
   */
  function feesRate(bytes4 _method) external override view returns (uint256) {
    return feesRates[_method];
  }

  /**
   * @dev token transfer
   */
  function transferERC20(
    IERC20 _token,
    address[] calldata _addresses,
    uint256[] calldata _values)
    external override payable withFees(_addresses.length) returns (bool)
  {
    return transferERC20Internal(_token, msg.sender, _addresses, _values);
  }

  /**
   * @dev token transfer operator
   */
  function transferERC20Operator(
    IERC20 _token,
    address _sender,
    address[] calldata _addresses,
    uint256[] calldata _values)
    external override onlyOperator returns (bool)
  {
    return transferERC20Internal(_token, _sender, _addresses, _values);
  }     

  /**
   * @dev ETH transfer
   */
  function transfer(
    address payable[] calldata _addresses,
    uint256[] calldata _values,
    uint256 _perCallGasLimit)
    external override payable withFees(_addresses.length) returns (bool)
  {
    require(_addresses.length == _values.length, "BT03");
    require(address(this).balance >= unsafeTotalValuePrivate(_values), "BT06");

    for(uint256 i = 0; i < _addresses.length; i++) {
      // solhint-disable-next-line avoid-call-value, avoid-low-level-calls
      (bool success, ) = _addresses[i].call{ gas: _perCallGasLimit, value: _values[i] }("");
      require(success, "BT07");
    }
    return true;
  }

  /**
   * @dev update feesRates
   */
  function updateFeesRates(address payable _vaultETH, bytes4[] memory _methods, uint256[] memory _feesRates)
    public override onlyOperator returns (bool)
  {
    require(_vaultETH != address(0), "BT08");
    require(_methods.length == _feesRates.length, "BT09");

    if (vaultETH_ != _vaultETH) {
      vaultETH_ = _vaultETH;
      emit VaultUpdate(_vaultETH);
    }

    for(uint256 i = 0; i < _methods.length; i++) {
      feesRates[_methods[i]] = _feesRates[i];
      emit FeesRateUpdate(_methods[i], _feesRates[i]);
    }

    return true;
  }

  /**
   * @dev transferERC20 internal
   */
  function transferERC20Internal(
    IERC20 _token,
    address _sender,
    address[] calldata _addresses,
    uint256[] calldata _values) internal returns (bool)
  {
    require(address(_token) != address(0), "BT02");
    require(_addresses.length == _values.length, "BT03");

    uint256 totalValue = unsafeTotalValuePrivate(_values);
    require(_token.balanceOf(_sender) >= totalValue
      && _token.allowance(_sender, address(this)) >= totalValue, "BT04");

    for(uint256 i = 0; i < _addresses.length; i++) {
      require(_token.transferFrom(_sender, _addresses[i], _values[i]), "BT05");
    }
    return true;
  }

  /**
   * @dev unsafe total value private
   * @notice value may overflow, hence to be used only for defensive checks
   */
  function unsafeTotalValuePrivate(uint256[] memory _values) private pure returns (uint256) {
    uint256 totalValue = 0;
    for(uint256 i = 0; i < _values.length; i++) {
      totalValue = totalValue + _values[i];
    }
    return totalValue;
  }
}
