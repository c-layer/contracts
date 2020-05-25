pragma solidity >=0.5.0 <0.6.0;

import "../util/deploy/Factory.sol";


/**
 * @title FactoryMock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 **/
contract FactoryMock is Factory {

  /**
   * @dev constructor
   */
  constructor() public Factory() {}

  /**
   * @dev defineProxyCode
   */
  function defineProxyCode(uint256 _id, bytes memory _proxyCode)
    public returns (bool)
  {
    return defineProxyCodeInternal(_id, _proxyCode);
  }

  /**
   * @dev defineContractCode
   */
  function defineContractCode(uint256 _id, bytes memory _code)
    public returns (bool)
  {
    return defineContractCodeInternal(_id, _code);
  }

  /**
   * @dev deployContract
   */
  function deployContractId(uint256 _id, address _core) public returns (bool)
  {
    address address_ = deployContractInternal(_id, _core);
    emit ContractDeployed(address_);
    return true;
  }

  /**
   * @dev deployContract
   */
  function deployContract(bytes memory _code) public returns (bool)
  {
    address address_ = deployContractInternal(_code);
    emit ContractDeployed(address_);
    return true;
  }

  event ContractDeployed(address address_);
}
