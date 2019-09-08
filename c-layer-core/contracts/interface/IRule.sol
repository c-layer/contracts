pragma solidity >=0.5.0 <0.6.0;


/**
 * @title IRule
 * @dev IRule interface
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 **/
interface IRule {
  function isAddressValid(address _address) external view returns (bool);
  function isTransferValid(address _from, address _to, uint256 _amount)
    external view returns (bool);
}
