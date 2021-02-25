pragma solidity ^0.8.0;

import "./LockableSig.sol";


/**
 * @title DelegateSig
 * @dev DelegateSig contract
 * The configuration is to be done in children
 * The following instruction allows to do it
 * addGrantInternal(contract, bytes4(keccak256(signature), [], 1);
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * DS01: Valid signatures must reach threshold
 * DS02: A grant must be defined
 * DS03: No grants must be defined
 * DS04: Enough delegates must be defined to reach threshold
 */
contract DelegateSig is LockableSig {
  bytes32 public constant GRANT = keccak256("GRANT");

  // destination x method => Grant
  mapping(address => mapping(bytes4 => Grant)) internal grants;
  struct Grant {
    address[] delegates;
    uint8 threshold;
  }
  bytes32 public grantsHash_ = GRANT;
  bool public grantsDefined_;

  /**
   * @dev check that the signatures reach the threshold for a specific operations
   */
  modifier onlyDelegates(
    bytes32[] memory _sigR, bytes32[] memory _sigS, uint8[] memory _sigV,
    address payable _destination, bytes memory _data)
  {
    bytes4 method = readSelector(_data);
    require(
      reviewDelegateSigs(
        _sigR,
        _sigS,
        _sigV,
        _destination,
        _data,
        method
      ) >= grants[_destination][method].threshold,
      "DS01"
    );
    _;
  }

  /**
   * @dev constructor
   */
  constructor(address[] memory _addresses, uint8 _threshold)
    LockableSig(_addresses, _threshold)
  {} // solhint-disable-line no-empty-blocks

  /**
   * @dev return the hash of the grants configuration
   */
  function grantsHash() public view returns (bytes32) {
    return grantsHash_;
  }

  /**
   * @dev check that grants has been defined
   */
  function grantsDefined() public view returns (bool) {
    return grantsDefined_;
  }

  /**
   * @dev returns the deletages of a specific operations
   */
  function grantDelegates(address _destination, bytes4 _method)
    public view returns (address[] memory)
  {
    return grants[_destination][_method].delegates;
  }

  /**
   * @dev returns the threshold for a specific operations
   */
  function grantThreshold(address _destination, bytes4 _method)
    public view returns (uint8)
  {
    return grants[_destination][_method].threshold;
  }

  /**
   * @dev returns the number of valid signatures for an operation
   */
  function reviewDelegateSigs(
    bytes32[] memory _sigR, bytes32[] memory _sigS, uint8[] memory _sigV,
    address payable _destination, bytes memory _data, bytes4 _method)
    public view returns (uint256)
  {
    Grant storage grant = grants[_destination][_method];
    return (reviewSignaturesInternal(
      _destination,
      0,
      _data,
      0,
      grant.delegates,
      _sigR,
      _sigS,
      _sigV)
    );
  }

  /**
   * @dev execute on behalf signers as delegates
   */
  function executeOnBehalf(
    bytes32[] memory _sigR, bytes32[] memory _sigS, uint8[] memory _sigV,
    address payable _destination, uint256 _value, bytes memory _data) public
    onlyDelegates(_sigR, _sigS, _sigV, _destination, _data)
    returns (bool)
  {
    require(grantsDefined_, "DS02");
    executeInternal(_destination, _value, _data);
    return true;
  }

  /**
   * @dev add a grant (delegates, threshold) to an operation
   * @dev same signatures of signers may be reused for all call to addGrant
   * @dev as the approval of grants, ie 'endDefinition()', requires signers
   * @dev to approve the grants hash
   */
  function addGrant(
    bytes32[] memory _sigR, bytes32[] memory _sigS, uint8[] memory _sigV,
    address _destination, bytes4 _method,
    address[] memory _delegates, uint8 _grantThreshold)
    public
    thresholdRequired(address(this), 0,
      abi.encodePacked(GRANT), 0,
      threshold_, _sigR, _sigS, _sigV)
    returns (bool)
  {
    require(!grantsDefined_, "DS03");
    require(_delegates.length >= _grantThreshold, "DS04");
    grants[_destination][_method] = Grant(_delegates, _grantThreshold);
    grantsHash_ = keccak256(
      abi.encode(
        grantsHash_,
        _destination,
        _method,
        _delegates,
        _grantThreshold
      )
    );
    return true;
  }

  /**
   * @dev lock grant definition
   * Definition will be fixed after to avoid any mismanipulation
   */
  function endDefinition(
    bytes32[] memory _sigR, bytes32[] memory _sigS, uint8[] memory _sigV)
    public
    thresholdRequired(address(this), 0,
      abi.encodePacked(grantsHash_), // conversion from Bytes32 to Bytes
      0, threshold_, _sigR, _sigS, _sigV)
    returns (bool)
  {
    require(!grantsDefined_, "DS03");
    updateReplayProtection();
    grantsDefined_ = true;
    return true;
  }
}
