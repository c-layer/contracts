pragma solidity ^0.8.0;

import "../operable/Operable.sol";


/**
 * @title Pausable
 * @dev Base contract which allows children to implement an emergency stop mechanism.
 *
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * PA01: the contract is paused
 * PA02: the contract is unpaused
 **/
contract Pausable is Operable {
  event Pause();
  event Unpause();

  bool public paused = false;


  /**
   * @dev Modifier to make a function callable only when the contract is not paused.
   */
  modifier whenNotPaused() {
    require(!paused, "PA01");
    _;
  }

  /**
   * @dev Modifier to make a function callable only when the contract is paused.
   */
  modifier whenPaused() {
    require(paused, "PA02");
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
