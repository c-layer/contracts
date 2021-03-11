pragma solidity ^0.8.0;

import "@c-layer/common/contracts/token/TokenERC20.sol";
import "./interface/IWrappedETH.sol";


/**
 * @title WrappedETH
 * @dev WrappedETH
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   WET01: Unable to transfer tokens to address 0
 *   WET02: Not enougth tokens
 *   WET03: Approval too low
 */
contract WrappedETH is TokenERC20, IWrappedETH {

  uint256 internal ratio_;

  /**
   * @dev constructor
   */
  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _decimals
  ) TokenERC20(_name, _symbol, _decimals, address(0), 0)
  { 
    ratio_ = 10 ** (_decimals - ETH_DECIMALS);
  }

  /**
   * @dev fallback function
   */
  //solhint-disable-next-line no-complex-fallback
  receive() external override payable {
    deposit();
  }

  /**
   * @dev deposit
   */
  function deposit() public override payable returns (bool) {
    return depositTo(msg.sender);
  }

  /**
   * @dev depositTo
   */
  function depositTo(address _to) public override payable returns (bool) {
    require(_to != address(0), "WET01");

    uint256 wrappedValue = msg.value * ratio_;
    balances[_to] = balances[_to]  + wrappedValue;
    totalSupply_ = totalSupply_ + wrappedValue;
    emit Transfer(address(0), _to, wrappedValue);
    return true;
  }

  /**
   * @dev withdraw
   */
  function withdraw(uint256 _value) public override returns (bool) {
    return withdrawFrom(msg.sender, msg.sender, _value);
  }

  /**
   * @dev withdrawFrom
   */
  function withdrawFrom(address _from, address _to, uint256 _value)
    public override returns (bool)
  {
    require(_to != address(0), "WET01");
    uint256 wrappedValue = _value * ratio_;
    require(wrappedValue <= balances[_from], "WET02");

    if (_from != msg.sender) {
      require(wrappedValue <= allowed[_from][msg.sender], "WET03");
      allowed[_from][msg.sender] = allowed[_from][msg.sender] - wrappedValue;
    }

    balances[_from] = balances[_from] - wrappedValue;
    totalSupply_ = totalSupply_ - wrappedValue;
    emit Transfer(_from, address(0), wrappedValue);

    payable(_to).transfer(_value);
    return true;
  }
}
