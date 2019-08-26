pragma solidity >=0.5.0 <0.6.0;

//import "./SeizableToken.sol";
//import "./TokenWithClaims.sol";
//import "./TokenRuleEngine.sol";
//import "../interface/IRule.sol";
//import "../interface/IClaimable.sol";
import "../interface/IERC20.sol";
import "./BaseTokenProxy.sol";
import "../core/CTokenCore.sol";


/**
 * @title CTokenProxy
 * @dev CTokenProxy contract
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */
contract CTokenProxy is IERC20, BaseTokenProxy {

  /**
   * @dev constructor
   */
  constructor(address _core) public BaseTokenProxy(_core) {}

  function name() public view returns (string memory) {
    return CTokenCore(core).name();
  }

  function symbol() public view returns (string memory) {
    return CTokenCore(core).symbol();
  }

  function decimals() public view returns (uint256) {
    return CTokenCore(core).decimals();
  }
}
