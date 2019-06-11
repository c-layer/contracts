pragma solidity >=0.5.0 <0.6.0;

import "./governance/Ownable.sol";
import "./interface/IWhitelist.sol";


/**
 * @title Whitelistable
 * @dev Whitelistable contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 * W01: address is not whitelisted
 *
 */
contract Whitelistable is Ownable {
  
  IWhitelist public whitelist;

  modifier onlyWhitelisted(address _address) {
    require(whitelist.isWhitelisted(_address), "W01");
    _;
  }

  function updateWhitelist(IWhitelist _whitelist) public onlyOwner {
    whitelist = _whitelist;
    emit WhitelistUpdated(whitelist);
  }

  event WhitelistUpdated(IWhitelist whitelist);
}
