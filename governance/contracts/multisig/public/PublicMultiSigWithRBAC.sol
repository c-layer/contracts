pragma solidity ^0.6.0;

import "./PublicMultiSig.sol";


/**
 * @title PublicMultiSigWithRBAC
 * @dev PublicMultiSigWithRBAC contract
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * PMSWR01: msg.sender is not a suggester
 * PMSWR02: msg.sender is not an approver
 * PMSWR03: msg.sender is not an executer
 */
contract PublicMultiSigWithRBAC is PublicMultiSig {

  struct ParticipantRBAC {
    bool suggester;
    bool approver;
    bool executer;
  }
  mapping(address => ParticipantRBAC) internal participantRBACs;

  /**
   * @dev Modifier for suggester only
   */
  modifier onlySuggester() {
    require(participantRBACs[msg.sender].suggester, "PMSWR01");
    _;
  }

  /**
   * @dev Modifier for approver only
   */
  modifier onlyApprover() {
    require(participantRBACs[msg.sender].approver, "PMSWR02");
    _;
  }

  /**
   * @dev Modifier for executer only
   */
  modifier onlyExecuter() {
    require(participantRBACs[msg.sender].executer, "PMSWR03");
    _;
  }

  /**
   * @dev contructor
   **/
  constructor(
    uint256 _threshold,
    uint256 _duration,
    address[] memory _participants,
    uint256[] memory _weights,
    bool[] memory _suggesters,
    bool[] memory _approvers,
    bool[] memory _executers)
    public PublicMultiSig(_threshold, _duration, _participants, _weights)
  {
    updateManyParticipantsRolesInternal(
      _participants,
      _suggesters,
      _approvers,
      _executers
    );
  }

  /**
   * @dev is the participant a suggeester
   */
  function isSuggester(address _address)
    public view returns (bool)
  {
    return participantRBACs[_address].suggester;
  }

  /**
   * @dev is the participant an approver
   */
  function isApprover(address _address) public view returns (bool) {
    return participantRBACs[_address].approver;
  }

  /**
   * @dev is the participant an executer
   */
  function isExecuter(address _address) public view returns (bool) {
    return participantRBACs[_address].executer;
  }

  /**
   * @dev execute the transaction
   */
  function execute(uint256 _transactionId) public override onlyExecuter returns (bool) {
    return super.execute(_transactionId);
  }

  /**
   * @dev suggest a new transaction
   */
  function suggest(
    address payable _destination,
    uint256 _value,
    bytes memory _data) public override onlySuggester returns (bool)
  {
    return super.suggest(_destination, _value, _data);
  }

  /**
   * @dev approve a transaction
   */
  function approve(
    uint256 _transactionId) public override onlyApprover returns (bool)
  {
    return super.approve(_transactionId);
  }

  /**
   * @dev revoke a transaction approval
   */
  function revokeApproval(
    uint256 _transactionId) public override onlyApprover returns (bool)
  {
    return super.revokeApproval(_transactionId);
  }

  /**
   * @dev add a participant
   * Participant role will be defaulted to approver
   * It is defined for compatibility reason with parent contract
   */
  function addParticipant(
    address _participant,
    uint256 _weight) public override onlyOperator returns (bool)
  {
    return addParticipantWithRoles(
      _participant,
      _weight,
      false,
      true,
      false
    );
  }

  /**
   * @dev add many participants
   * Participants role will be defaulted to approver
   * It is defined for compatibility reason with parent contract
   */
  function addManyParticipants(
    address[] memory _participants,
    uint256[] memory _weights) override public onlyOperator returns (bool)
  {
    for (uint256 i = 0; i < _participants.length; i++) {
      addParticipantWithRoles(
        _participants[i],
        _weights[i],
        false,
        true,
        false
      );
    }
    return true;
  }

  /**
   * @dev add participants with roles
   */
  function addParticipantWithRoles(
    address _participant,
    uint256 _weight,
    bool _suggester,
    bool _approver,
    bool _executer) public onlyOperator returns (bool)
  {
    super.addParticipant(_participant, _weight);
    updateParticipantRolesInternal(
      _participant,
      _suggester,
      _approver,
      _executer
    );
    return true;
  }

  /**
   * @dev add many participants with roles
   */
  function addManyParticipantsWithRoles(
    address[] memory _participants,
    uint256[] memory _weights,
    bool[] memory _suggesters,
    bool[] memory _approvers,
    bool[] memory _executers) public onlyOperator returns (bool)
  {
    super.addManyParticipants(_participants, _weights);
    updateManyParticipantsRoles(
      _participants,
      _suggesters,
      _approvers,
      _executers
    );
    return true;
  }

  /**
   *  @dev update participant roles
   **/
  function updateParticipantRoles(
    address _participant,
    bool _suggester,
    bool _approver,
    bool _executer) public onlyOperator returns (bool)
  {
    return updateParticipantRolesInternal(
      _participant,
      _suggester,
      _approver,
      _executer
    );
  }

  /**
   * @dev update many participants roles
   */
  function updateManyParticipantsRoles(
    address[] memory _participants,
    bool[] memory _suggesters,
    bool[] memory _approvers,
    bool[] memory _executers) public onlyOperator returns (bool)
  {
    return updateManyParticipantsRolesInternal(
      _participants,
      _suggesters,
      _approvers,
      _executers
    );
  }

  /**
   *  @dev update participant roles internal
   **/
  function updateParticipantRolesInternal(
    address _participant, 
    bool _suggester,
    bool _approver,
    bool _executer) internal returns (bool)
  {
    ParticipantRBAC storage participantRBAC = participantRBACs[_participant];
    participantRBAC.suggester = _suggester;
    participantRBAC.approver = _approver;
    participantRBAC.executer = _executer;
    
    emit ParticipantRolesUpdated(
      _participant,
      _suggester,
      _approver,
      _executer
    );
    return true;
  }

  /**
   * @dev update many participants role internals
   */
  function updateManyParticipantsRolesInternal(
    address[] memory _participants,
    bool[] memory _suggesters,
    bool[] memory _approvers,
    bool[] memory _executers) internal returns (bool)
  {
    for (uint256 i = 0; i < _participants.length; i++) {
      updateParticipantRolesInternal(
        _participants[i],
        _suggesters[i],
        _approvers[i],
        _executers[i]
      );
    }
    return true;
  }

  event ParticipantRolesUpdated(
    address indexed participant,
    bool _suggester,
    bool _approver,
    bool _executer
  );
}
