pragma solidity >=0.5.0 <0.6.0;

import "../StateMachine.sol";


/**
 * @title StateMachineMock
 * @dev StateMachineMock contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */
contract StateMachineMock is StateMachine {

  function addStepPublic(
    uint256 _transitionEndTime,
    uint256 _transitionDelay) public onlyOwner returns (uint256)
  {
    return addStep(_transitionEndTime, _transitionDelay);
  }

  function addHistoricalStepPublic(
    uint256 _stepTime,
    uint256 _transitionEndTime,
    uint256 _transitionDelay) public onlyOwner returns (uint256)
  {
    return addHistoricalStep(
      _stepTime, _transitionEndTime, _transitionDelay);
  }

  function updateCurrentStepPublic(
    uint256 _transitionEndTime,
    uint256 _transitionDelay) public onlyOwner
  {
    updateCurrentStep(
      _transitionEndTime, _transitionDelay);
  }

  function nextStepPublic() public onlyOwner {
    nextStep();
  }

}
