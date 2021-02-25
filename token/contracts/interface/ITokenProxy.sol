pragma solidity ^0.8.0;

import "@c-layer/common/contracts/interface/IERC20.sol";
import "@c-layer/common/contracts/core/Proxy.sol";


/**
 * @title IToken proxy
 * @dev Token proxy interface
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 */
abstract contract ITokenProxy is IERC20, Proxy {

  function canTransfer(address, address, uint256)
    virtual public view returns (uint256);
  
  function emitTransfer(address _from, address _to, uint256 _value)
    virtual public returns (bool);

  function emitApproval(address _owner, address _spender, uint256 _value)
    virtual public returns (bool);
}
