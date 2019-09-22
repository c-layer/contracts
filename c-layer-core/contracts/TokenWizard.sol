pragma solidity >=0.5.0 <0.6.0;

import "./util/governance/Operable.sol";
import "./TokenFactory.sol";


/**
 * @title TokenWizard
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * @dev Work In Progress
 *
 * Error messages
 **/
contract TokenWizard is Operable {

  TokenFactory public factory;
  string public name;

  constructor(string memory _name, TokenFactory _factory) public {
    name = _name;
    factory = _factory;
  }

  function deployMintableToken(
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    address _core,
    uint256 _delegateId,
    uint256[] memory _mintSupplies
    ) public returns (address proxy)
  {
    // 1- Precheck

    // 2- Create proxy
    //proxy = factory.createProxy(_configuration, _core);

    // 3- Configure the core
    //core.defineProxy(proxy, delegateId, _name, _symbol, _decimals);

    // 4- Prepare the token
    //core.mint(proxy, _mintSupplies);
  }

}
