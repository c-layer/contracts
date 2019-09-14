pragma solidity >=0.5.0 <0.6.0;

import "./IRule.sol";
import "./IClaimable.sol";
import "../TokenStorage.sol";


/**
 * @title ITokenCore
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 **/
contract ITokenCore {

  function name() public view returns (string memory);

  /***********  TOKEN DATA   ***********/
  function token(address _token) public view returns (
    bool mintingFinished,
    uint256 allTimeIssued,
    uint256 allTimeRedeemed,
    uint256 allTimeSeized,
    uint256[2] memory lock,
    uint256 freezedUntil,
    IRule[] memory,
    IClaimable[] memory);
  function tokenAudits(address _token, address _holder) public view returns (
    uint256 createdAt,
    uint256 lastTransactionAt,
    uint256 receivedAmount,
    uint256 sentAmount);
  function tokenProofs(address _token, address _holder, uint256 _proofId)
    public view returns (uint256[3] memory);
  function canTransfer(address, address, uint256)
    public returns (uint256);

  /***********  TOKEN ADMIN  ***********/
  function issue(address, uint256)
    public returns (bool);
  function redeem(address, uint256)
    public returns (bool);
  function mint(address, address, uint256)
    public returns (bool);
  function finishMinting(address)
    public returns (bool);
  function mintAtOnce(address, address[] memory, uint256[] memory)
    public returns (bool);
  function seize(address _token, address, uint256)
    public returns (bool);
  function freeze(address _token, address _address, uint256 _until)
    public returns (bool);
  function freezeManyAddresses(
    address _token,
    address[] memory _addresses,
    uint256 _until) public returns (bool);
  function createProof(address, address, uint256, uint256)
    public returns (bool);
  function defineLock(address, uint256, uint256, address[] memory)
    public returns (bool);
  function defineRules(address, IRule[] memory) public returns (bool);
  function defineClaims(address, IClaimable[] memory) public returns (bool);

  /************  CORE ADMIN  ************/

  event Issue(address indexed token, uint256 amount);
  event Redeem(address indexed token, uint256 amount);
  event Mint(address indexed token, uint256 amount);
  event MintFinished(address indexed token);
  event ProofCreated(address indexed token, address holder, uint256 proofId);
  event RulesDefined(address indexed token, address[] rules);
  event LockDefinition(
    address _token,
    uint256 startAt,
    uint256 endAt,
    address[] exceptions
  );
  event ClaimsDefined(address indexed token, address[] claims);
}
