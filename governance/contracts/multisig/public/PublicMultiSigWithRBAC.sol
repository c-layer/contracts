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
    updateManyParticipantsRoles(
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
   * @dev add many participants with roles
   */
  function updateManyParticipantsRoles(
    address[] memory _participants,
    bool[] memory _suggesters,
    bool[] memory _approvers,
    bool[] memory _executers) public onlyOperator returns (bool)
  {
    for (uint256 i = 0; i < _participants.length; i++) {
      ParticipantRBAC storage participantRBAC = participantRBACs[_participants[i]];
      participantRBAC.suggester = _suggesters[i];
      participantRBAC.approver = _approvers[i];
      participantRBAC.executer = _executers[i];
    
      emit ParticipantRolesUpdated(
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
