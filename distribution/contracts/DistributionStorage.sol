pragma solidity ^0.6.0;

import "@c-layer/common/contracts/math/SafeMath.sol";
import "@c-layer/common/contracts/core/OperableStorage.sol";
import "./interface/IDistributionStorage.sol";


/**
 * @title DistributionStorage
 * @dev DistributionStorage contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * DC01: ETH must be successfully transferred
*/
contract DistributionStorage is IDistributionStorage, OperableStorage {
  using SafeMath for uint256;

  struct InvestorData {
    //uint256 transferIn;
    //uint64 lastTransferInAt;
    uint256 transferOut;
    uint64 lastTransferOutAt;
  }

  struct DistributionData {
    uint256 delegateId;
    IVault vault;
    IERC20 token;

    mapping(DistributionParameter => uint256) parameters;
  }

  string internal name_;

  uint256 internal distributionCount_;
  mapping(uint256 => address) internal distributionAddresses;
  mapping(address => DistributionData) internal distributions;

  // distribution x investor => investor data
  mapping(address => mapping(address => InvestorData)) internal investors;

  /**
   * @dev currentTime()
   */
  function currentTime() internal view returns (uint64) {
    // solhint-disable-next-line not-rely-on-time
    return uint64(now);
  }
}
