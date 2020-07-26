pragma solidity ^0.6.0;

import "@c-layer/common/contracts/core/OperableCore.sol";
import "./interface/IDistributionCore.sol";
import "./interface/IDistributionDelegate.sol";
import "./DistributionStorage.sol";


/**
 * @title DistributionCore
 * @dev DistributionCore contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * DC01: Distribution address must not be ALL_PROXIES
 * DC02: Vault must be a valid address
 * DC03: DelegateId must not be null
 * DC04: Must have the same number of investors and amount distributed
 * DC05: ETH must be successfully transferred
*/
contract DistributionCore is IDistributionCore, OperableCore, DistributionStorage {

  /**
   * @dev constructor
   */
  constructor(string memory _name, address[] memory _sysOperators)
    public OperableCore(_sysOperators)
  {
    name_ = _name;
  }

  /**
   * @dev contract name
   */
  function name() public view override returns (string memory) {
    return name_;
  }

  /**
   * @dev distributionCount
   */
  function distributionCount() public view override returns (uint256) {
    return distributionCount_;
  }

  /**
   * @dev distributionCount
   */
  function distributionAddress(uint256 _distributionId)
    public view override returns (address)
  {
    return distributionAddresses[_distributionId];
  }

  /**
   * @dev distribution
   */
  function distribution(address _distribution) public view override
    returns (
    uint256 delegateId,
    IVault vault,
    IERC20 token)
  {
    DistributionData storage distributionData = distributions[_distribution];
    return (
      distributionData.delegateId,
      distributionData.vault,
      distributionData.token
    );
  }

  /**
   * @dev vault
   */
  function vault() public view override onlyProxy returns (IVault) {
    return distributions[msg.sender].vault;
  }

  /**
   * @dev investor
   */
  function investor(address _distribution, address _investor)
    public view override returns (uint256 transferOut, uint256 lastTransferOutAt)
  {
    InvestorData storage investorData = investors[_distribution][_investor];
    return (investorData.transferOut, investorData.lastTransferOutAt);
  }

  /**
   * @dev create distribution
   */
  function defineDistribution(
    address _distribution,
    uint256 _delegateId,
    IVault _vault,
    IERC20 _token) public override onlyCoreOp returns (bool)
  {
    require(_distribution != ALL_PROXIES, "DC01");
    defineProxyInternal(_distribution, _delegateId);

    DistributionData storage distribution_ = distributions[_distribution];
    require(address(_vault) != address(0), "DC02");
    require(_delegateId != 0, "DC03");

    distribution_.delegateId = _delegateId;
    distribution_.vault = _vault;
    distribution_.token = _token;
    
    distributionAddresses[distributionCount_++] = _distribution;
    emit DistributionDefined(_distribution, _delegateId, _vault, _token);
    return true;
  }

  /**
   * @dev remove distribution
   */
  function removeDistribution(address _distribution)
    public override onlyCoreOp returns (bool)
  {
    removeProxyInternal(_distribution);

    delete distributions[_distribution];
    emit DistributionRemoved(_distribution);
    return true;
  }

  /**
   * @dev (privileges) distribute token
   */
  function distribute(
    address _distribution,
    address _investor,
    uint256 _amount)
    public override onlyProxyOp(_distribution) returns (bool)
  {
    DistributionData storage distributionData = distributions[_distribution];

    vaultTransferInternal(distributionData.vault, distributionData.token, _investor, _amount);
    return true;
  }

  /**
   * @dev (privileges) distribute many tokens
   */
  function distributeMany(
    address _distribution,
    address[] memory _investors,
    uint256[] memory _amounts)
    public override onlyProxyOp(_distribution) returns (bool)
  {
    require(_amounts.length == _investors.length, "DC04");
    for(uint256 i=0; i < _investors.length; i++) {
       distribute(_distribution, _investors[i], _amounts[i]);
    }
    return true;
  }

  /**
   * @dev deposit
   */
  function deposit(IERC20 /*_token*/, address _investor, uint256 /*_amount*/)
    public override onlyProxy returns (bool)
  {
    InvestorData storage investorData = investors[msg.sender][_investor];

    // TBD

    investorData.lastTransferOutAt = currentTime();
    return true;
  }

  /**
   * @dev withdraw
   */
  function withdraw(IERC20 _token, address _investor, uint256 _amount)
    public override onlyProxy returns (bool)
  {
    DistributionData storage distributionData = distributions[msg.sender];

    uint256 available =
      IDistributionDelegate(delegates[distributionData.delegateId]).tokensAvailable(msg.sender, _investor);
    uint256 withdrawable = (available > _amount) ? _amount: available;
    vaultTransferInternal(distributionData.vault, _token, _investor, withdrawable); 
    return true;
  }

  /**
   * @dev vault internal transfer
   */
  function vaultTransferInternal(
    IVault _vault,
    IERC20 _token,
    address _investor,
    uint256 _amount) internal returns (bool)
  {
    if (_token == ETHER) {
      (bool success,) = _vault.transferETH(_investor, _amount, bytes(""));
      require(success, "DC05");
    } else {
      require(_vault.transfer(_token, _investor, _amount), "DC02");
    }
    return true;
  }
}
