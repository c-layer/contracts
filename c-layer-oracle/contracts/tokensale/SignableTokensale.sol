pragma solidity >=0.5.0 <0.6.0;

import "./LimitedTokensale.sol";


/**
 * @title SignableTokensale
 * @dev SignableTokensale contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * STS01: purchase agreement must be signed
 * STS02: purchase agreement must be valid
 */
contract SignableTokensale is LimitedTokensale {

  mapping(address => bool) internal signatures;
  bytes32 internal purchaseAgreementHash_;

  modifier whenPurchaseAgreementSigned(address _investor) {
    require(signatures[_investor], "STS01");
    _;
  }

  /**
   * @dev investor signatures
   */
  function investorSignature(address _investor)
    public view returns (bool)
  {
    return signatures[_investor];
  }

  /**
   * @dev purchase agreement hash
   */
  function purchaseAgreementHash() public view returns (bytes32) {
    return purchaseAgreementHash_;
  }

  /**
   * @dev update schedule
   */
  function updatePurchaseAgreementHash(bytes32 _purchaseAgreementHash_)
    public onlyOperator beforeSaleIsOpened
  {
    purchaseAgreementHash_ = _purchaseAgreementHash_;
    emit PurchaseAgreementHash(purchaseAgreementHash_);
  }

  /**
   * @dev sign purchase agreement
   */
  function signPurchaseAgreement(bytes32 _purchaseAgreementHash)
    public beforeSaleIsClosed payable returns (bool)
  {
    if (purchaseAgreementHash_ != bytes32(0)) {
      require(
        _purchaseAgreementHash == purchaseAgreementHash_, "STS06");
      signatures[msg.sender] = true;
    }

    if (msg.value > 0) {
      investETH();
    }
  }

  /* Investment */
  function investInternal(address _investor, uint256 _amount, bool _refundUnspentETH)
    internal whenPurchaseAgreementSigned(_investor)
  {
    super.investInternal(_investor, _amount, _refundUnspentETH);
  }

  event PurchaseAgreementHash(bytes32 _hash);
}
