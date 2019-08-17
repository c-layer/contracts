pragma solidity >=0.5.0 <0.6.0;


import "../governance/Operable.sol";


/**
 * @title Pausable
 * @dev Base contract which allows children to implement an emergency stop mechanism.
 */
contract Pausable is Operable {
  event Pause();
  event Unpause();

  bool public paused = false;


  /**
   * @dev Modifier to make a function callable only when the contract is not paused.
   */
  modifier whenNotPaused() {
    require(!paused);
    _;
  }

  /**
   * @dev Modifier to make a function callable only when the contract is paused.
   */
  modifier whenPaused() {
    require(paused);
    _;
  }

  /**
   * @dev called by the operator to pause, triggers stopped state
   */
  function pause() public onlyOperator whenNotPaused {
    paused = true;
    emit Pause();
  }

  /**
   * @dev called by the operator to unpause, returns to normal state
   */
  function unpause() public onlyOperator whenPaused {
    paused = false;
    emit Unpause();
  }
}
