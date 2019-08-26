pragma solidity >=0.5.0 <0.6.0;

import "./OperableTokenStorage.sol";


/**
 * @title IssuableTokenStorage
 * @dev BasicTokenStorage contract which implement an issuing mechanism.
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract IssuableTokenStorage is OperableTokenStorage {

  struct IssuanceData {
    // Overflow on attributes below is an expected behavior
    // The contract should not be locked because
    // the max uint256 value is reached
    // Usage of these values must handle the overflow
    uint256 allTimeIssued; // potential overflow
    uint256 allTimeRedeemed; // potential overflow
  }
  mapping (address => IssuanceData) public tokenIssuance;

}
