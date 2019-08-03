pragma solidity >=0.5.0 <0.6.0;

/**
 * @title IOperable
 * @dev The Operable contract enable the restrictions of operations to a set of operators
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */
contract IOperable {

  function isOperator(address _address) public view returns (bool);
  function removeOperator(address _address) public returns (bool);
  function defineOperator(string memory _role, address _address) public returns (bool);

  event OperatorRemoved(address address_);
  event OperatorDefined(
    string role,
    address address_
  );
}
