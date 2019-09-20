pragma solidity >=0.5.0 <0.6.0;

import "./interface/IERC20.sol";
import "./governance/Operable.sol";


/**
 * @title VaultERC20
 * @dev Vault managing ERC20
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 * VLT01: Invalid number of parameters
 */
contract VaultERC20 is Operable {

  function transfer(IERC20 _token, address _to, uint256 _value)
    public onlyOperator returns (bool)
  {
    return _token.transfer(_to, _value);
  }

  function transferFrom(
    IERC20 _token, address _from, address _to, uint256 _value)
    public onlyOperator returns (bool)
  {
    return _token.transferFrom(_from, _to, _value);
  }

  function approve(IERC20 _token, address _spender, uint256 _value)
    public onlyOperator returns (bool)
  {
    return _token.approve(_spender, _value);
  }

  function approveMany(IERC20 _token,
    address[] memory _spenders, uint256[] memory _values)
    public onlyOperator returns (bool)
  {
    require(_spenders.length == _values.length, "VLT01");
    bool result = true;
    for (uint256 i=0; i < _spenders.length; i++) {
      result = result && _token.approve(_spenders[i], _values[i]);
    }
    return result;
  }

  function increaseApproval(IERC20 _token, address _spender, uint _addedValue)
    public onlyOperator returns (bool)
  {
    return _token.increaseApproval(_spender, _addedValue);
  }

  function decreaseApproval(IERC20 _token, address _spender, uint _subtractedValue)
    public onlyOperator returns (bool)
  {
    return _token.decreaseApproval(_spender, _subtractedValue);
  }

}
