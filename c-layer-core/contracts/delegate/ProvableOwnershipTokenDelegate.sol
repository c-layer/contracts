pragma solidity >=0.5.0 <0.6.0;

import "../interface/ICoreConfiguration.sol";
import "./AuditableTokenDelegate.sol";


/**
 * @title ProvableOwnershipTokenDelegate
 * @dev ProvableOwnershipToken is an erc20 token
 * with ability to record a proof of ownership
 *
 * When desired a proof of ownership can be generated.
 * The proof is stored within the contract.
 * A proofId is then returned.
 * The proof can later be used to retrieve the amount needed.
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 **/
contract ProvableOwnershipTokenDelegate is AuditableTokenDelegate {

  /*
   * @dev create proof
   */
  function createProof(address _token, address _holder)
    public returns (bool)
  {
    Proof[] storage proofs = tokens[_token].proofs[_holder];
    uint256 proofId = proofs.length;

    uint256 lastTransactionAt =
      audits[_token][uint256(Scope.DEFAULT)].addressData[_holder].lastTransactionAt;

    TokenData storage token = tokens[_token];
    proofs.push(Proof(
      token.balances[_holder],
      (lastTransactionAt == 0) ?
        uint64(0) : uint64(lastTransactionAt),
      currentTime()));
    emit ProofCreated(_token, _holder, proofId);
    return true;
  }
}
