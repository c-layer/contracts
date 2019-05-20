pragma solidity >=0.5.0 <0.6.0;


/**
 * @title IStateMachine
 * @dev IStateMachine interface
 * Implements a programmable state machine
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */
contract IStateMachine {
  function stepsCount() public view returns (uint256);
  function currentStep() public view returns (uint256);
}
