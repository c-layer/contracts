pragma solidity >=0.5.0 <0.6.0;


/**
 * @title Documentation interface
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
*/
contract IDocumentation {

  function repositoryURL() public view returns (string memory);

  function documentsCount(address _address)
    public view returns (uint32);

  function documentName(address _address, uint32 _id)
    public view returns (string memory);

  function documentHash(address _address, uint32 _id)
    public view returns (bytes32);

  function documentVersion(address _address, uint32 _id)
    public view returns (uint32);

  function documentLastUpdate(address _address, uint32 _id)
    public view returns (uint256);

  function documentIsValid(address _address, uint32 _id)
    public view returns (bool);

  function updateRepositoryURL(string memory _repositoryURL)
    public returns (bool);

  function addDocument(
    address _address, string memory _name, bytes32 _hash)
    public returns (bool);

  function updateDocument(
    address _address, uint32 _id, string memory _name, bytes32 _hash)
    public returns(bool);

  function invalidateDocument(
    address _address, uint32 _id) public returns (bool);

  event DocumentAdded(address _address, uint32 id, string name, bytes32 hash);
  event DocumentUpdated(
    address _address, uint32 id, string name, bytes32 hash, uint32 version
  );
  event DocumentInvalidated(address _address, uint32 id);
}
