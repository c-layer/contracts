pragma solidity >=0.5.0 <0.6.0;

import "./interface/IDocumentation.sol";
import "./governance/Ownable.sol";


/**
 * @title Documentation
 * @dev Documentation contract
 * This contract track the legal and other documents associated with some addresses.
 * Both the generation and the verification are off chain processes.
 * It is done through a versioning of the document hash
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 * DO01: Document associated address must be provided
 * DO02: Document name must be provided
 * DO03: Document hash must be provided
 * DO04: Document does not exist
*/
contract Documentation is IDocumentation, Ownable {

  // Repository of the documents
  string internal repositoryURL_;

  struct Document {
    string name; // Name of the document
    bytes32 hash; // SHA3 of the document (generated and verifiable off chain)
    uint32 version; // Current version of the document
    uint256 lastUpdate; // Last update on the document
    bool valid; // document is applicable if valid
  }

  mapping(address => uint32) internal documentsCounts;
  mapping(address => mapping(uint32 => Document)) internal documents;

  constructor(string memory _repositoryURL) public {
    repositoryURL_ = _repositoryURL;
  }

  /**
   * @dev returns the document repository URL
   */
  function repositoryURL() public view returns (string memory) {
    return repositoryURL_;
  }

  /**
   * @dev returns the count of documents for an address
   */
  function documentsCount(address _address)
    public view returns (uint32)
  {
    return documentsCounts[_address];
  }

  /**
   * @dev returns the document name
   */
  function documentName(address _address, uint32 _id)
    public view returns (string memory)
  {
    return documents[_address][_id].name;
  }

  /**
   * @dev returns the document hash
   */
  function documentHash(address _address, uint32 _id)
    public view returns (bytes32)
  {
    return documents[_address][_id].hash;
  }

  /**
   * @dev returns the document version
   */
  function documentVersion(address _address, uint32 _id)
    public view returns (uint32)
  {
    return documents[_address][_id].version;
  }

  /**
   * @dev returns the document last update
   */
  function documentLastUpdate(address _address, uint32 _id)
    public view returns (uint256)
  {
    return documents[_address][_id].lastUpdate;
  }

  /**
   * @dev returns if the document is valid
   */
  function documentIsValid(address _address, uint32 _id)
    public view returns (bool)
  {
    return documents[_address][_id].valid;
  }

  /**
   * @dev update repository URL
   */
  function updateRepositoryURL(string memory _repositoryURL)
    public onlyOwner returns (bool)
  {
    repositoryURL_ = _repositoryURL;
    return true;
  }

  /**
   * @dev add the document with name and hash to an address
   */
  function addDocument(
    address _address,
    string memory _name,
    bytes32 _hash) public onlyOwner returns (bool)
  {
    require(_address != address(0), "DO01");
    require(bytes(_name).length != 0, "DO02");
    require(_hash != 0, "DO03");

    uint32 id = documentsCounts[_address];
    Document memory document = Document(
      _name,
      _hash,
      0,
      currentTime(),
      true
    );
    documents[_address][id] = document;
    documentsCounts[_address] = id+1;

    emit DocumentAdded(
      _address,
      id,
      _name,
      _hash
    );
    return true;
  }

  /**
   * @dev update an existing document name and hash
   */
  function updateDocument(
    address _address,
    uint32 _id,
    string memory _name,
    bytes32 _hash) public onlyOwner returns (bool)
  {
    Document storage document = documents[_address][_id];
    require(document.hash != 0, "DO04");

    document.name = _name;
    document.hash = _hash;
    document.version++;
    document.lastUpdate = currentTime();
    document.valid = true;

    emit DocumentUpdated(
      _address,
      _id,
      _name,
      _hash,
      document.version
    );
    return true;
  }

  /**
   * @dev invalid a document from a address
   */
  function invalidateDocument(
    address _address,
    uint32 _id) public onlyOwner returns (bool)
  {
    Document storage document = documents[_address][_id];
    require(document.hash != 0, "DO04");

    document.lastUpdate = currentTime();
    document.valid = false;
    emit DocumentInvalidated(_address, _id);
    return true;
  }

  function currentTime() internal view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return now;
  }
}
