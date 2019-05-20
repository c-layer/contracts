pragma solidity >=0.5.0 <0.6.0;

import "./LockableSig.sol";


/**
 * @title VaultSig
 * @dev VaultSig contract
 * The vault restrict operation to ETH or ERC20 transfer only
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 *
 * Error messages
 * VS01: no data is expected when transfer ETH
 * VS02: there should be no ETH provided when data is found
 * VS03: this contract only accept data for ERC20 transfer
 */
contract VaultSig is LockableSig {

  bytes4 constant public ERC20_TRANSFER_SELECTOR = bytes4(
    keccak256("transfer(address,uint256)")
  );

  /**
   * @dev constructor
   */
  constructor(address[] memory _addresses, uint8 _threshold)
    public LockableSig(_addresses, _threshold)
  {}  // solhint-disable-line no-empty-blocks

  /**
   * @dev fallback function
   */
  function () external payable {
    require(msg.data.length == 0, "VS01");
  }

  /**
   * @dev execute the transaction
   */
  function execute(
    bytes32[] memory _sigR, bytes32[] memory _sigS, uint8[] memory _sigV,
    address payable _destination,
    uint256 _value,
    bytes memory _data,
    uint256 _validity)
    public
    stillValid(_validity)
    thresholdRequired(_destination, _value, _data, _validity,
      threshold_, _sigR, _sigS, _sigV)
    returns (bool)
  {
    if (_data.length == 0) {
      executeInternal(_destination, _value, "");
    } else {
      require(_value == 0, "VS02");
      require(readSelector(_data) == ERC20_TRANSFER_SELECTOR, "VS03");
      executeInternal(_destination, 0, _data);
    }
    return true;
  }

  /**
   * @dev execute an ERC20 transfer
   */
  function transferERC20(
    bytes32[] memory _sigR, bytes32[] memory _sigS, uint8[] memory _sigV,
    address payable _token,
    address _destination,
    uint256 _value) public
    returns (bool)
  {
    return execute(
      _sigR,
      _sigS,
      _sigV,
      _token,
      0,
      abi.encodeWithSelector(
        ERC20_TRANSFER_SELECTOR, _destination, _value
      ),
      0
    );
  }

  /**
   * @dev execute a transfer
   */
  function transfer(
    bytes32[] memory _sigR, bytes32[] memory _sigS, uint8[] memory _sigV,
    address payable _destination,
    uint256 _value) public
    returns (bool)
  {
    return execute(
      _sigR,
      _sigS,
      _sigV,
      _destination,
      _value,
      "",
      0
    );
  }
}
