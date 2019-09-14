pragma solidity >=0.5.0 <0.6.0;

import "../interface/IRule.sol";


/**
 * @title YesNoRule
 * @dev YesNoRule interface
 * The rule always answer the same response through isValid
 * Usefull for testing IWithRule implementation
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract YesNoRule is IRule {
  bool public yesNo;

  constructor(bool _yesNo) public {
    yesNo = _yesNo;
  }

  function isAddressValid(address /* _from */) public view returns (bool) {
    return yesNo;
  }

  function isTransferValid(
    // solhint-disable-next-line space-after-comma
    address /* _from */, address /*_to */, uint256 /*_amount */)
    public view returns (bool)
  {
    return yesNo;
  }
}
