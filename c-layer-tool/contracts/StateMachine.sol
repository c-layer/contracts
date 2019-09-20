pragma solidity >=0.5.0 <0.6.0;

import "./math/SafeMath.sol";
import "./governance/Ownable.sol";
import "./interface/IStateMachine.sol";


/**
 * @title StateMachine
 * @dev StateMachine contract
 * Implements a programmable state machine
 * The machine can follow automatically transition from
 * one state to another if one of the condition is matched:
 * - transitionEndTime is not 0 and lower than current time
 * - transitionDelay is not 0 and lower than the delay since
 *   the beginning of the step (ie stepTime)
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 * SM01: No plans are configured
 * SM02: Historical steps must happened in the past
 * SM03: New step must be no earlier the previous one
 * SM04: There is no transitions to update
 * SM05: Transition update must be in the future
 * SM06: Current step is already the last step
 * SM07: The current step has already a transition
*/
contract StateMachine is IStateMachine, Ownable {
  using SafeMath for uint256;

  struct Step {
    uint256 stepTime;

    // Automatic transition attributes
    uint256 transitionEndTime;
    uint256 transitionDelay;
  }
  Step[] private steps;
  uint8 private manualStepId;

  /**
   * @dev stepTime
   **/
  function stepTime(uint256 _stepId) public view returns (uint256) {
    return steps[_stepId].stepTime;
  }

  /**
   * @dev transitionEndTime
   **/
  function transitionEndTime(uint256 _stepId) public view returns (uint256) {
    return steps[_stepId].transitionEndTime;
  }

  /**
   * @dev transitionDelay
   **/
  function transitionDelay(uint256 _stepId) public view returns (uint256) {
    return steps[_stepId].transitionDelay;
  }

  /**
   * @dev stepsCount
   **/
  function stepsCount() public view returns (uint256) {
    return steps.length;
  }

  /**
   * @dev stepEndTime
   * returns the step end time based on its start time
   **/
  function stepEndTime(uint256 _stepId, uint256 _startedAt)
    public view returns (uint256)
  {
    uint256 endTime = ~uint256(0);
    Step memory step = steps[_stepId];

    if (step.transitionDelay != 0) {
      endTime = _startedAt.add(step.transitionDelay);
    }
    if (step.transitionEndTime != 0 && step.transitionEndTime < endTime) {
      endTime = step.transitionEndTime;
    }
    return endTime;
  }

  /**
   * @dev currentStep
   * returns the current step
   **/
  function currentStep() public view returns (uint256) {
    require(steps.length > 0, "SM01");
    uint256 currentStepId = manualStepId;

    uint256 currentStepTime = steps[manualStepId].stepTime;
    for (uint256 i = currentStepId; i < steps.length; i++) {
      uint256 endTime = stepEndTime(i, currentStepTime);
      if (endTime >= currentTime() || (i == steps.length-1)) {
        currentStepId = i;
        break;
      }
      currentStepTime = endTime;
    }

    return currentStepId;
  }

  /**
   * @dev addStep
   * If there will be automatically a transition to the next step
   * when either the end time or the delay after the begining of that step
   * expires
   * @param _transitionEndTime plan end time for the step
   * @param _transitionDelay plan delay for that step
   **/
  function addStep(
    uint256 _transitionEndTime,
    uint256 _transitionDelay) internal onlyOwner returns (uint256)
  {
    uint256 _stepTime = 0;
    if (steps.length == 0) {
      _stepTime = currentTime();
    }
    steps.push(Step(_stepTime, _transitionEndTime, _transitionDelay));
    return steps.length-1;
  }

  /**
   * @dev addHistoricalStep
   * Allow to add step in the past
   *
   * @param _stepTime historical step time
   * @param _transitionEndTime plan end time for the step
   * @param _transitionDelay plan delay for that step
   **/
  function addHistoricalStep(
    uint256 _stepTime,
    uint256 _transitionEndTime,
    uint256 _transitionDelay) internal onlyOwner returns (uint256)
  {
    // the stepTime must be in the past and consecutive to previous steps
    require(_stepTime < currentTime(), "SM02");
    if (steps.length > 0) {
      require(_stepTime > steps[steps.length-1].stepTime, "SM03");
    }

    uint256 newId = addStep(_transitionEndTime, _transitionDelay);
    steps[newId].stepTime = _stepTime;
    return newId;
  }

  /**
   * @dev updateCurrentStep
   * Allow adjustement of the current step planning
   * It is restricted to the following cases:
   * - There is already a transition planned
   * - The adjustement must be in the future
   *   if the transition EndTime is updated.
   *   The check on the transition Delay is too costly
   **/
  function updateCurrentStep(
    uint256 _transitionEndTime,
    uint256 _transitionDelay) internal onlyOwner
  {
    uint256 currentStepId = currentStep();

    if (_transitionEndTime > 0) {
      require(steps[currentStepId].transitionEndTime > 0, "SM04");
      require(_transitionEndTime > currentTime(), "SM05");
      steps[currentStepId].transitionEndTime = _transitionEndTime;
    }

    if (_transitionDelay > 0) {
      require(steps[currentStepId].transitionDelay > 0, "SM04");
      steps[currentStepId].transitionDelay = _transitionDelay;
    }
  }

  /**
   * @dev nextStep
   * progress to the next step
   * cannnot be done when either:
   * - the current step is the last step
   * - the current step has already a planned transition
   **/
  function nextStep() internal {
    uint256 currentStepId = currentStep();
    require(currentStepId < steps.length - 1, "SM06");

    // Prevent manual iteration over next steps
    require(
      steps[currentStepId].transitionEndTime == 0 &&
      steps[currentStepId].transitionDelay == 0, "SM07");

    manualStepId = uint8(currentStepId.add(1));
    steps[manualStepId].stepTime = currentTime();
  }

  function currentTime() internal view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return block.timestamp;
  }
}
