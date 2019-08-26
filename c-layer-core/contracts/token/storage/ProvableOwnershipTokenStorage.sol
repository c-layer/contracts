pragma solidity >=0.5.0 <0.6.0;

import "./AuditableTokenStorage.sol";


/**
 * @title ProvableOwnershipTokenStorage
 * @dev ProvableOwnershipTokenStorage is an erc20 token
 * with ability to record a proof of ownership
 *
 * When desired a proof of ownership can be generated.
 * The proof is stored within the contract.
 * A proofId is then returned.
 * The proof can later be used to retrieve the amount needed.
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 **/
contract ProvableOwnershipTokenStorage is AuditableTokenStorage {
  enum Field { AMOUNT, DATE_FROM, DATE_TO }

  struct ProofTokenData {
    mapping(address => uint256[3][]) proofs;
  }
  mapping (address => ProofTokenData) internal tokenProofs;

  /**
   * @dev number of proof stored in the contract
   */
  function proofLength(address _token, address _holder) public view returns (uint256) {
    return tokenProofs[_token].proofs[_holder].length;
  }

  /**
   * @dev amount contains for the proofId reccord
   */
  function proof(address _token, address _holder, uint256 _proofId)
    public view returns (uint256, uint256, uint256)
  {
    return (
      tokenProofs[_token].proofs[_holder][_proofId][uint256(Field.AMOUNT)],
      tokenProofs[_token].proofs[_holder][_proofId][uint256(Field.DATE_FROM)],
      tokenProofs[_token].proofs[_holder][_proofId][uint256(Field.DATE_TO)]
    );
  }

  /**
   * @dev called to challenge a proof at a point in the past
   * Return the amount tokens owned by the proof owner at that time
   */
  function checkProof(address _token, address _holder, uint256 _proofId, uint256 _at)
    public view returns (uint256)
  {
    uint256[3][] storage proofs = tokenProofs[_token].proofs[_holder];
    if (_proofId < proofs.length) {
      uint256[3] storage proofChecked = proofs[_proofId];

      if (proofChecked[uint256(Field.DATE_FROM)] <= _at
        && _at <= proofChecked[uint256(Field.DATE_TO)])
      {
        return proofChecked[uint256(Field.AMOUNT)];
      }
    }
    return 0;
  }

  /**
   * @dev can be used to force create a proof (with a fake amount potentially !)
   * Only usable by child contract internaly
   */
  function createProofInternal(
    address _token, address _holder, uint256 _amount, uint256 _from) internal
  {
    uint256[3][] storage proofs = tokenProofs[_token].proofs[_holder];
    uint proofId = proofs.length;
    proofs.push([ _amount, _from, currentTime() ]);
    emit ProofCreated(_token, _holder, proofId);
  }

  event ProofCreated(address _token, address _holder, uint256 _proofId);
}
