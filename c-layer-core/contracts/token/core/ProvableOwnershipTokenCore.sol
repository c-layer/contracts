pragma solidity >=0.5.0 <0.6.0;

import "../storage/ProvableOwnershipTokenStorage.sol";
import "./AuditableTokenCore.sol";


/**
 * @title ProvableOwnershipTokenCore
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
contract ProvableOwnershipTokenCore is AuditableTokenCore, ProvableOwnershipTokenStorage {

  /**
   * @dev called to create a proof of token ownership
   */
  function createProof(address _token, address _holder) public {
    createProofInternal(
      _token,
      _holder,
      balanceOf(_holder),
      lastTransactionAt(_token, _holder)
    );
  }
}
