pragma solidity ^0.8.0;

import "../interface/IRule.sol";


/**
 * @title YesNoRule
 * @dev YesNoRule
 * The rule always answer the same response through isValid
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 */
contract YesNoRule is IRule {
  bool public yesNo;

  constructor(bool _yesNo) {
    yesNo = _yesNo;
  }

  function isAddressValid(address /* _from */) override public view returns (bool) {
    return yesNo;
  }

  function isTransferValid(
    // solhint-disable-next-line space-after-comma
    address /* _from */, address /*_to */, uint256 /*_amount */)
    override public view returns (bool)
  {
    return yesNo;
  }
}
