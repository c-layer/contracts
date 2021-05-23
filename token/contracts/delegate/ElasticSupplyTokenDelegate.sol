pragma solidity ^0.8.0;

import "./MintableTokenDelegate.sol";


/**
 * @title ElasticSupplyTokenDelegate
 * @dev ElasticSupplyTokenDelegate contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   ES01: Elasticity cannot be 0
 *   ES02: Address is invalid
 *   ES03: Not enougth tokens
 *   ES04: Approval too low
*/
contract ElasticSupplyTokenDelegate is MintableTokenDelegate {

  uint256 internal constant ELASTICITY_PRECISION = 10**9;

  function totalSupply() public override view returns (uint256) {
    return tokens[msg.sender].totalSupply * elasticity(msg.sender) / ELASTICITY_PRECISION;
  }

  function balanceOf(address _owner) public override view returns (uint256) {
    return tokens[msg.sender].balances[_owner] * elasticity(msg.sender) / ELASTICITY_PRECISION;
  }

  function elasticity(address _token) public virtual view returns (uint256) {
    uint256 tokenElasticity = tokens[_token].elasticity;
    return (tokenElasticity != 0) ? tokenElasticity : ELASTICITY_PRECISION;
  }

  /**
   * @dev Function to define token elasticity
   * @param _token the token
   * @param _elasticity the elasticity
   * @return A boolean that indicates if the operation was successful.
   */
  function defineElasticity(address _token, uint256 _elasticity) external returns (bool) {
    require(_elasticity / ELASTICITY_PRECISION != 0, "ES01");
    TokenData storage token = tokens[_token];
    token.elasticity = _elasticity;
    emit ElasticityUpdated(_token, _elasticity);
    return true;
  }

  /**
   * @dev Function to burn tokens
   * @param _amount The amount of tokens to burn.
   * @return A boolean that indicates if the operation was successful.
   */
  function burn(address _token, uint256 _amount) public override returns (bool)
  {
    TokenData storage token = tokens[_token];
    uint256 baseAmount = _amount * ELASTICITY_PRECISION / elasticity(_token);
    require(baseAmount <= token.balances[msg.sender], "MT02");
    token.totalSupply = token.totalSupply - baseAmount;
    token.balances[msg.sender] = token.balances[msg.sender] - baseAmount;
    token.allTimeBurned = token.allTimeBurned + _amount;

    require(
      TokenProxy(_token).emitTransfer(msg.sender, address(0), _amount),
      "MT03");
    emit Burned(_token, _amount);
    return true;
  }

  /**
   * @dev Function to mint all tokens at once
   * @param _recipients The addresses that will receive the minted tokens.
   * @param _amounts The amounts of tokens to mint.
   * @return success The boolean that indicates if the operation was successful.
   */
  function mint(address _token, address[] memory _recipients, uint256[] memory _amounts)
    public override canMint(_token) returns (bool success)
  {
    require(_recipients.length == _amounts.length, "MT04");
    for(uint256 i=0; i < _amounts.length; i++) {
      mintInternal(_token, _recipients[i], _amounts[i]);
    }
    return true;
  }

 /**
   * @dev transfer
   */
  function transferInternal(STransferData memory _transferData)
    override virtual internal returns (bool)
  {
    TokenData storage token = tokens[_transferData.token];
    address caller = _transferData.caller;
    address sender = _transferData.sender;
    address receiver = _transferData.receiver;
    uint256 value = _transferData.value;
    uint256 baseValue = value * ELASTICITY_PRECISION / elasticity(_transferData.token);

    require(receiver != address(0) && receiver != ANY_ADDRESSES, "ES02");
    require(baseValue <= token.balances[sender], "ES03");

    if (caller != address(0)
      && (selfManaged[sender]
        || !hasProxyPrivilege(caller, _transferData.token, msg.sig)))
    {
      require(value <= token.allowances[sender][caller], "ES04");
      token.allowances[sender][caller] = token.allowances[sender][caller] - value;
    }

    token.balances[sender] = token.balances[sender] - baseValue;
    token.balances[receiver] = token.balances[receiver] + baseValue;
    return true;
  }

  /**
   * @dev can transfer
   */
  function canTransferInternal(STransferData memory _transferData)
    override internal view returns (TransferCode code)
  {
    TokenData storage token = tokens[_transferData.token];
    address sender = _transferData.sender;
    address receiver = _transferData.receiver;
    uint256 baseValue = _transferData.value * ELASTICITY_PRECISION / elasticity(_transferData.token);

    if (sender == address(0)) {
      return TransferCode.INVALID_SENDER;
    }

    if (receiver == address(0)) {
      return TransferCode.NO_RECIPIENT;
    }

    if (baseValue > token.balances[sender]) {
      return TransferCode.INSUFFICIENT_TOKENS;
    }

    return TransferCode.OK;
  }

  /**
   * @dev Function to mint tokens internal
   * @param _to The address that will receive the minted tokens.
   * @param _amount The amount of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mintInternal(address _token, address _to, uint256 _amount)
    override virtual internal returns (bool)
  {
    TokenData storage token = tokens[_token];
    uint256 baseAmount = _amount * ELASTICITY_PRECISION / elasticity(_token);
    token.totalSupply = token.totalSupply + baseAmount;
    token.balances[_to] = token.balances[_to] + baseAmount;
    token.allTimeMinted = token.allTimeMinted + _amount;
    require(
       TokenProxy(_token).emitTransfer(address(0), _to, _amount), "MT03");
    emit Minted(_token, _amount);
    return true;
  }
}
