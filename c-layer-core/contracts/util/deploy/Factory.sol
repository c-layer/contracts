pragma solidity >=0.5.0 <0.6.0;

import "../convert/BytesConvert.sol";


/**
 * @title Factory
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 **/
contract Factory {
  using BytesConvert for bytes;

  mapping(uint256 => bytes) internal contractCodes_;

  /**
   * @dev contracctCode
   */
  function contractCode(uint256 _id) public view returns (bytes memory) {
    return contractCodes_[_id];
  }

  /**
   * @dev defineContractCodeInternal
   */
  function defineContractCodeInternal(
    uint256 _id,
    bytes memory _contractCode) internal returns (bool)
  {
    contractCodes_[_id] = _contractCode;
    emit ContractCodeDefined(keccak256(_contractCode));
    return true;
  }

  /**
   * @dev defineProxyCodeInternal
   */
  function defineProxyCodeInternal(
    uint256 _id,
    bytes memory _proxyCode) internal returns (bool)
  {
    contractCodes_[_id] = _proxyCode;
    emit ContractCodeDefined(keccak256(_proxyCode));
    return true;
  }

  /**
   * @dev deployContractInternal
   */
  function deployContractInternal(uint256 _id,
    address _core)
    internal returns (address address_)
  {
    bytes32 coreAddress = abi.encode(_core).toBytes32();

    return deployContractInternal(
      abi.encodePacked(contractCodes_[_id], coreAddress)
    );
  }

  /**
   * @dev deployContractInternal
   */
  function deployContractInternal(bytes memory _code)
    internal returns (address address_)
  {
    assembly {
      address_ := create(0, add(_code, 0x20), mload(_code))
    }
  }

  event ContractCodeDefined(bytes32 codeHash);
}
