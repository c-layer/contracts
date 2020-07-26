pragma solidity ^0.6.0;

import "../interface/IDistributionStorage.sol";


/**
 * @title Distribution
 * @dev Distribution contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 */
abstract contract IDistributionCore is IDistributionStorage {

  function name() public view virtual returns (string memory);
  function distributionCount() public view virtual returns (uint256);
  function distributionAddress(uint256 _distributionId)
    public view virtual returns (address);
  function distribution(address _proxy) public view virtual
    returns (uint256 delegateId, IVault vault, IERC20 token);
  function vault() public view virtual returns (IVault);
 
  function investor(address _proxy, address _investor)
    public view virtual returns (uint256 transferOut, uint256 lastTransferOutAt);


  function distribute(
    address _distribution,
    address _investor,
    uint256 _amount) public virtual returns (bool);
  function distributeMany(address _distribution,
    address[] memory _investors, uint256[] memory _amounts)
    public virtual returns (bool);

  function deposit(IERC20 _token, address _investor, uint256 _amount)
    public virtual returns (bool);
  function withdraw(IERC20 _token, address _investor, uint256 _amount)
    public virtual returns (bool);
 
 function defineDistribution(
    address _distribution,
    uint256 _delegateId,
    IVault _vault,
    IERC20 _token) public virtual returns (bool);
  function removeDistribution(address _distribution)
    public virtual returns (bool);
}
