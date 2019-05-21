pragma solidity >=0.5.0 <0.6.0;

import "./Ownable.sol";


/**
 * @title Operator
 * @dev The Operator contract contains list of addresses authorized to specific operations
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 *
 * Error messages
 * OP01: Message sender must be an operator
 */
contract Operator is Ownable {

  mapping (address => bool) operators_;
  address[] internal addresses_;

  /**
   * @dev Throws if called by any account other than the operator
   */
  modifier onlyOperator {
    require(operators_[msg.sender], "OP01");
    _;
  }

  /**
   * @dev return the count of operator
   */
  function addresses() public view returns (address[] memory) {
    return addresses_;
  }

  /**
   * @dev defineOperator role
   * @param _addresses operator addresses.
   */
  function defineOperators(address[] memory _addresses)
    public onlyOwner
  {
    for (uint256 i = 0; i < addresses_.length; i++) {
      delete operators_[addresses_[i]];
    }

    if(_addresses.length == 0) {
      emit OperatorsCleared(addresses_.length);
    } else {
      for (uint256 j = 0; j < _addresses.length; j++) {
        operators_[_addresses[j]] = true;
      }
      addresses_ = _addresses;
      emit OperatorDefined(_addresses);
    }
  }

  event OperatorsCleared(uint256 size);
  event OperatorDefined(
    address[] addresses_
  );
}
