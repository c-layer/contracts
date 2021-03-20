'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const TokenNFT = artifacts.require('TokenNFT.sol');

const NAME = 'name';
const SYMBOL = 'SYM';
const BASE_URI = 'https://nft.c-layer.org/?id=0x';
const SUPPLY = [ 1, 2, 4, 8, 16, 32, 64 ];
const NULL_ADDRESS = '0x'.padEnd(42, '0');

contract('TokenNFT', function (accounts) {
  let token;

  beforeEach(async function () {
    token = await TokenNFT.new(NAME, SYMBOL, BASE_URI, accounts[0], SUPPLY);
  });

  it('should have a name', async function () {
    const name = await token.name();
    assert.equal(name, NAME, 'name');
  });

  it('should have a symbol', async function () {
    const symbol = await token.symbol();
    assert.equal(symbol, SYMBOL, 'symbol');
  });

  it('should have a baseURI', async function () {
    const baseURI = await token.baseURI();
    assert.equal(baseURI, BASE_URI, 'baseURI');
  });

  it('should have a total supply', async function () {
    const totalSupply = await token.totalSupply();
    assert.equal(totalSupply, SUPPLY.length, 'total supply');
  });

  it('should have URI for token', async function () {
    const tokenURI = await token.tokenURI(64);
    assert.equal(tokenURI, BASE_URI + 40, 'tokenURI');
  });

  it('should have token balance for initial account', async function () {
    const balance0 = await token.balanceOf(accounts[0]);
    assert.equal(balance0, SUPPLY.length, 'balance account 0');
  });

  it('should have no tokens balance for account1', async function () {
    const balance0 = await token.balanceOf(accounts[1]);
    assert.equal(balance0, 0, 'balance account 1');
  });

  it('should have account 0 as owner of all tokens', async function () {
    const owners = await Promise.all(SUPPLY.map((id) => token.ownerOf(id)));
    assert.deepEqual(owners, SUPPLY.map(() => accounts[0]), 'owners');
  });

  it('should have the correct indexes for all tokens', async function () {
    const indexes = await Promise.all(SUPPLY.map((_, i) =>
      token.tokenByIndex(i).then((tokenId) => tokenId.toNumber())));
    assert.deepEqual(indexes, SUPPLY, 'indexes');
  });

  it('should have the correct indexes for account 0 tokens', async function () {
    const indexes = await Promise.all(SUPPLY.map((_, i) =>
      token.tokenOfOwnerByIndex(accounts[0], i).then((tokenId) => tokenId.toNumber())));
    assert.deepEqual(indexes, SUPPLY, 'indexes');
  });

  it('should have 0 approvals for account 1 on account 0', async function () {
    const approvals = await token.approvals(accounts[0], accounts[1]);
    assert.equal(approvals, 0, 'approvals 0');
  });

  it('should have token 16 not approved for account 1 on account 0', async function () {
    const isApproved = await token.isApproved(accounts[0], accounts[1], 16);
    assert.ok(!isApproved, 'approved');
  });

  it('should have account 1 not approved for all from account 0', async function () {
    const isApprovedForAll = await token.isApprovedForAll(accounts[0], accounts[1]);
    assert.ok(!isApprovedForAll, 'approved for all');
  });

  it('should let account 0 transfer token 8 to account 1', async function () {
    const tx = await token.transfer(accounts[1], 8);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Transfer', 'event');
    assert.equal(tx.logs[0].args.from, accounts[0], 'from');
    assert.equal(tx.logs[0].args.to, accounts[1], 'to');
    assert.equal(tx.logs[0].args.tokenId, 8, 'value');
  });

  it('should let account 0 approve token 32 to account 1', async function () {
    const tx = await token.approve(accounts[1], 32);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Approval', 'event');
    assert.equal(tx.logs[0].args.owner, accounts[0], 'owner');
    assert.equal(tx.logs[0].args.spender, accounts[1], 'spender');
    assert.equal(tx.logs[0].args.tokenId, 32, 'value');
  });

  it('should prevent account 0 to transfer token 1 to address 0', async function () {
    await assertRevert(token.transfer(NULL_ADDRESS, 1), 'NFT01');
  });

  it('should prevent account 1 to transfer token 64 to account 0', async function () {
    await assertRevert(token.transfer(accounts[0], 64, { from: accounts[1] }), 'NFT02');
  });

  it('should prevent account 1 to transfer token 64 from account 0', async function () {
    await assertRevert(token.transferFrom(
      accounts[0], accounts[1], 64, { from: accounts[1] }), 'NFT03');
  });

  describe('with account 0 approval token 64 to account 1', function () {
    beforeEach(async function () {
      await token.approve(accounts[1], 64);
    });

    it('should have approval on token 64 for account 0 to account 1', async function () {
      const approvals = await token.approvals(accounts[0], accounts[1]);
      assert.equal(approvals, 64, 'approvals 0');
    });

    it('should have token 64 approved for account 1 on account 0', async function () {
      const isApproved = await token.isApproved(accounts[0], accounts[1], 64);
      assert.ok(isApproved, 'approved');
    });

    it('should have account 1 not approved for all from account 0', async function () {
      const isApprovedForAll = await token.isApprovedForAll(accounts[0], accounts[1]);
      assert.ok(!isApprovedForAll, 'approved for all');
    });

    it('should let account1 transfer token 64 from account 0', async function () {
      const tx = await token.transferFrom(
        accounts[0], accounts[1], 64, { from: accounts[1] });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'Transfer', 'event');
      assert.equal(tx.logs[0].args.from, accounts[0], 'from');
      assert.equal(tx.logs[0].args.to, accounts[1], 'to');
      assert.equal(tx.logs[0].args.tokenId, 64, 'value');
    });

    it('should prevent account 1 to transfer token 32 from account 0', async function () {
      await assertRevert(token.transferFrom(
        accounts[0], accounts[1], 32, { from: accounts[1] }), 'NFT03');
    });
  });
});
