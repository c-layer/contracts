'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const TokenERC721 = artifacts.require('TokenERC721.sol');
const ERC721TokenReceiverMock = artifacts.require('ERC721TokenReceiverMock.sol');

const INTERFACES = {
  erc165: '0x01ffc9a7',
  erc721: '0x80ac58cd',
  erc721Enumerable: '0x780e9d63',
  erc721Metadata: '0x5b5e139f',
};

const NAME = 'name';
const SYMBOL = 'SYM';
const TEMPLATE_URI = {
  base: 'https://nft.c-layer.org/?id=0x',
  extension: '.html',
};
const SUPPLY = [ 1, 2, 4, 8, 16, 32, 64 ];
const NULL_ADDRESS = '0x'.padEnd(42, '0');

contract('TokenERC721', function (accounts) {
  let token;

  beforeEach(async function () {
    token = await TokenERC721.new(NAME, SYMBOL,
      TEMPLATE_URI.base, TEMPLATE_URI.extension, accounts[0], SUPPLY);
  });

  it('should support ERC165', async function () {
    const success = await token.supportsInterface(INTERFACES.erc165);
    assert.ok(success, 'erc165');
  });

  it('should support ERC721', async function () {
    const success = await token.supportsInterface(INTERFACES.erc721);
    assert.ok(success, 'erc721');
  });

  it('should support ERC721Enumerable', async function () {
    const success = await token.supportsInterface(INTERFACES.erc721Enumerable);
    assert.ok(success, 'erc721Enumerable');
  });

  it('should support ERC721Metadata', async function () {
    const success = await token.supportsInterface(INTERFACES.erc721Metadata);
    assert.ok(success, 'erc721Metadata');
  });

  it('should not support anything', async function () {
    const success = await token.supportsInterface('0x01234567');
    assert.ok(!success, 'anything');
  });

  it('should not support everything', async function () {
    const success = await token.supportsInterface('0xffffffff');
    assert.ok(!success, 'everything');
  });

  it('should have a name', async function () {
    const name = await token.name();
    assert.equal(name, NAME, 'name');
  });

  it('should have a symbol', async function () {
    const symbol = await token.symbol();
    assert.equal(symbol, SYMBOL, 'symbol');
  });

  it('should have a total supply', async function () {
    const totalSupply = await token.totalSupply();
    assert.equal(totalSupply, SUPPLY.length, 'total supply');
  });

  it('should have URI for token', async function () {
    const tokenURI = await token.tokenURI(64);
    assert.equal(tokenURI, TEMPLATE_URI.base + 40 + TEMPLATE_URI.extension, 'tokenURI');
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

  it('should have no approved for token 16', async function () {
    const getApproved = await token.getApproved(16);
    assert.equal(getApproved, NULL_ADDRESS, 'approved');
  });

  it('should have account 1 not approved for all from account 0', async function () {
    const isApprovedForAll = await token.isApprovedForAll(accounts[0], accounts[1]);
    assert.ok(!isApprovedForAll, 'approved for all');
  });

  it('should let account 0 define approval for all', async function () {
    const tx = await token.setApprovalForAll(accounts[1], true);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'ApprovalForAll', 'event');
    assert.equal(tx.logs[0].args.owner, accounts[0], 'owner');
    assert.equal(tx.logs[0].args.operator, accounts[1], 'operator');
    assert.equal(tx.logs[0].args.approved, true, 'approved');
  });

  it('should let account 0 transfer token 8 to account 1', async function () {
    const tx = await token.transferFrom(accounts[0], accounts[1], 8);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Transfer', 'event');
    assert.equal(tx.logs[0].args.from, accounts[0], 'from');
    assert.equal(tx.logs[0].args.to, accounts[1], 'to');
    assert.equal(tx.logs[0].args.tokenId, 8, 'value');
  });

  it('should let account 0 safeTransfer token 64 to account 1', async function () {
    const tx = await token.safeTransferFrom(
      accounts[0], accounts[1], 64);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Transfer', 'event');
    assert.equal(tx.logs[0].args.from, accounts[0], 'from');
    assert.equal(tx.logs[0].args.to, accounts[1], 'to');
    assert.equal(tx.logs[0].args.tokenId, 64, 'value');
  });

  it('should let account 0 safeTransfer token 64 to account 1 with data', async function () {
    const tx = await token.safeTransferFrom(
      accounts[0], accounts[1], 64, '0x12345');
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Transfer', 'event');
    assert.equal(tx.logs[0].args.from, accounts[0], 'from');
    assert.equal(tx.logs[0].args.to, accounts[1], 'to');
    assert.equal(tx.logs[0].args.tokenId, 64, 'value');
  });

  it('should let account 0 approve token 32 to account 1', async function () {
    const tx = await token.approve(accounts[1], 32);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Approval', 'event');
    assert.equal(tx.logs[0].args.owner, accounts[0], 'owner');
    assert.equal(tx.logs[0].args.approved, accounts[1], 'spender');
    assert.equal(tx.logs[0].args.tokenId, 32, 'value');
  });

  it('should prevent account 0 to transfer token 1 to address 0', async function () {
    await assertRevert(token.transferFrom(accounts[0], NULL_ADDRESS, 1), 'TN02');
  });

  it('should prevent account 1 to transfer token 64 to account 0', async function () {
    await assertRevert(token.transferFrom(accounts[1], accounts[0], 64, { from: accounts[1] }), 'TN04');
  });

  it('should prevent account 1 to transfer token 64 from account 0', async function () {
    await assertRevert(token.transferFrom(
      accounts[0], accounts[1], 64, { from: accounts[1] }), 'TN05');
  });

  describe('with token 64 approved to account 1 from account 0', function () {
    beforeEach(async function () {
      await token.approve(accounts[1], 64);
    });

    it('should have token 64 approved for account 1 on account 0', async function () {
      const getApproved = await token.getApproved(64);
      assert.equal(getApproved, accounts[1], 'approved');
    });

    it('should have account 1 not approved for all from account 0', async function () {
      const isApprovedForAll = await token.isApprovedForAll(accounts[0], accounts[1]);
      assert.ok(!isApprovedForAll, 'approved for all');
    });

    it('should let account1 transfer token 64 from account 0', async function () {
      const tx = await token.transferFrom(
        accounts[0], accounts[1], 64, { from: accounts[1] });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 2);
      assert.equal(tx.logs[0].event, 'Approval', 'event');
      assert.equal(tx.logs[0].args.owner, accounts[0], 'owner');
      assert.equal(tx.logs[0].args.approved, NULL_ADDRESS, 'spender');
      assert.equal(tx.logs[0].args.tokenId, 64, 'value');
      assert.equal(tx.logs[1].event, 'Transfer', 'event');
      assert.equal(tx.logs[1].args.from, accounts[0], 'from');
      assert.equal(tx.logs[1].args.to, accounts[1], 'to');
      assert.equal(tx.logs[1].args.tokenId, 64, 'value');
    });

    it('should let account1 safeTransfer token 64 from account 0', async function () {
      const tx = await token.safeTransferFrom(
        accounts[0], accounts[1], 64, { from: accounts[1] });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 2);
      assert.equal(tx.logs[0].event, 'Approval', 'event');
      assert.equal(tx.logs[0].args.owner, accounts[0], 'owner');
      assert.equal(tx.logs[0].args.approved, NULL_ADDRESS, 'spender');
      assert.equal(tx.logs[0].args.tokenId, 64, 'value');
      assert.equal(tx.logs[1].event, 'Transfer', 'event');
      assert.equal(tx.logs[1].args.from, accounts[0], 'from');
      assert.equal(tx.logs[1].args.to, accounts[1], 'to');
      assert.equal(tx.logs[1].args.tokenId, 64, 'value');
    });

    it('should let account1 safeTransfer token 64 from account 0 with data', async function () {
      const tx = await token.methods['safeTransferFrom(address,address,uint256,bytes)'](
        accounts[0], accounts[1], 64, '0x12345', { from: accounts[1] });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 2);
      assert.equal(tx.logs[0].event, 'Approval', 'event');
      assert.equal(tx.logs[0].args.owner, accounts[0], 'owner');
      assert.equal(tx.logs[0].args.approved, NULL_ADDRESS, 'spender');
      assert.equal(tx.logs[0].args.tokenId, 64, 'value');
      assert.equal(tx.logs[1].event, 'Transfer', 'event');
      assert.equal(tx.logs[1].args.from, accounts[0], 'from');
      assert.equal(tx.logs[1].args.to, accounts[1], 'to');
      assert.equal(tx.logs[1].args.tokenId, 64, 'value');
    });

    it('should prevent account 1 to transfer token 32 from account 0', async function () {
      await assertRevert(token.transferFrom(
        accounts[0], accounts[1], 32, { from: accounts[1] }), 'TN05');
    });

    describe('with token 64 transferred to account 2', function () {
      beforeEach(async function () {
        await token.transferFrom(accounts[0], accounts[2], 64);
      });

      it('should have token 64 not approved for account 1 on account 0', async function () {
        const approved = await token.getApproved(64);
        assert.equal(approved, NULL_ADDRESS, 'not approved');
      });

      it('should have account 1 not approved for all from account 0', async function () {
        const isApprovedForAll = await token.isApprovedForAll(accounts[0], accounts[1]);
        assert.ok(!isApprovedForAll, 'approved for all');
      });

      it('should prevent account 1 to transfer token 64 from account 0', async function () {
        await assertRevert(token.transferFrom(
          accounts[0], accounts[1], 64, { from: accounts[1] }), 'TN04');
      });

      it('should prevent account 1 to transfer token 64 from account 2', async function () {
        await assertRevert(token.transferFrom(
          accounts[2], accounts[1], 64, { from: accounts[1] }), 'TN05');
      });
    });
  });

  describe('with account 1 operator on all account 0 tokens', function () {
    beforeEach(async function () {
      await token.setApprovalForAll(accounts[1], true);
    });

    it('should have accounts 1 approved for all account 0 tokens', async function () {
      const isApprovedForAll = await token.isApprovedForAll(accounts[0], accounts[1]);
      assert.ok(isApprovedForAll, 'approved');
    });

    it('should have accounts 0 not approved for all account 1 tokens', async function () {
      const isApprovedForAll = await token.isApprovedForAll(accounts[1], accounts[0]);
      assert.ok(!isApprovedForAll, 'not approved');
    });

    it('should let account1 transfer token 64 from account 0', async function () {
      const tx = await token.transferFrom(
        accounts[0], accounts[2], 64, { from: accounts[1] });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'Transfer', 'event');
      assert.equal(tx.logs[0].args.from, accounts[0], 'from');
      assert.equal(tx.logs[0].args.to, accounts[2], 'to');
      assert.equal(tx.logs[0].args.tokenId, 64, 'value');
    });

    it('should let account1 transfer token 32 from account 0', async function () {
      const tx = await token.transferFrom(
        accounts[0], accounts[2], 32, { from: accounts[1] });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'Transfer', 'event');
      assert.equal(tx.logs[0].args.from, accounts[0], 'from');
      assert.equal(tx.logs[0].args.to, accounts[2], 'to');
      assert.equal(tx.logs[0].args.tokenId, 32, 'value');
    });

    it('should let account1 safeTransfer token 64 from account 0', async function () {
      const tx = await token.safeTransferFrom(
        accounts[0], accounts[2], 64, { from: accounts[1] });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'Transfer', 'event');
      assert.equal(tx.logs[0].args.from, accounts[0], 'from');
      assert.equal(tx.logs[0].args.to, accounts[2], 'to');
      assert.equal(tx.logs[0].args.tokenId, 64, 'value');
    });

    it('should let account1 safeTransfer token 64 from account 0 with data', async function () {
      const tx = await token.methods['safeTransferFrom(address,address,uint256,bytes)'](
        accounts[0], accounts[2], 64, '0x12345', { from: accounts[1] });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'Transfer', 'event');
      assert.equal(tx.logs[0].args.from, accounts[0], 'from');
      assert.equal(tx.logs[0].args.to, accounts[2], 'to');
      assert.equal(tx.logs[0].args.tokenId, 64, 'value');
    });

    describe('with token 64 transferred to account 2', function () {
      beforeEach(async function () {
        await token.transferFrom(accounts[0], accounts[2], 64);
      });

      it('should let account1 transfer token 32 from account 0', async function () {
        const tx = await token.transferFrom(
          accounts[0], accounts[2], 32, { from: accounts[1] });
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, 'Transfer', 'event');
        assert.equal(tx.logs[0].args.from, accounts[0], 'from');
        assert.equal(tx.logs[0].args.to, accounts[2], 'to');
        assert.equal(tx.logs[0].args.tokenId, 32, 'value');
      });

      it('should prevent account 1 to transfer token 64 from account 0', async function () {
        await assertRevert(token.transferFrom(
          accounts[0], accounts[1], 64, { from: accounts[1] }), 'TN04');
      });

      it('should prevent account 1 to transfer token 64 from account 2', async function () {
        await assertRevert(token.transferFrom(
          accounts[2], accounts[1], 64, { from: accounts[1] }), 'TN05');
      });
    });
  });

  describe('with a erc721 token receiver', function () {
    let receiver;

    beforeEach(async function () {
      receiver = await ERC721TokenReceiverMock.new();
    });

    it('should let account0 transfer token 64 to receiver', async function () {
      const tx = await token.transferFrom(
        accounts[0], receiver.address, 64);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'Transfer', 'event');
      assert.equal(tx.logs[0].args.from, accounts[0], 'from');
      assert.equal(tx.logs[0].args.to, receiver.address, 'to');
      assert.equal(tx.logs[0].args.tokenId, 64, 'value');
    });

    it('should let account0 safeTransfer token 64 to receiver', async function () {
      const tx = await token.safeTransferFrom(
        accounts[0], receiver.address, 64);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'Transfer', 'event');
      assert.equal(tx.logs[0].args.from, accounts[0], 'from');
      assert.equal(tx.logs[0].args.to, receiver.address, 'to');
      assert.equal(tx.logs[0].args.tokenId, 64, 'value');

      const logs = await receiver.getPastEvents('allEvents', {
        fromBlock: tx.receipt.blockNumber,
        toBlock: tx.receipt.blockNumber,
      });
      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'ERC721Received', 'event');
      assert.equal(logs[0].args.operator, accounts[0], 'from');
      assert.equal(logs[0].args.from, accounts[0], 'to');
      assert.equal(logs[0].args.tokenId, 64, 'tokenId');
      assert.isNull(logs[0].args.data, 'value');
    });

    it('should let account1 safeTransfer token 64 to receiver with data', async function () {
      const tx = await token.safeTransferFrom(
        accounts[0], receiver.address, 64, '0x12345');
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'Transfer', 'event');
      assert.equal(tx.logs[0].args.from, accounts[0], 'from');
      assert.equal(tx.logs[0].args.to, receiver.address, 'to');
      assert.equal(tx.logs[0].args.tokenId, 64, 'value');

      const logs = await receiver.getPastEvents('allEvents', {
        fromBlock: tx.receipt.blockNumber,
        toBlock: tx.receipt.blockNumber,
      });
      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'ERC721Received', 'event');
      assert.equal(logs[0].args.operator, accounts[0], 'from');
      assert.equal(logs[0].args.from, accounts[0], 'to');
      assert.equal(logs[0].args.tokenId, 64, 'tokenId');
      assert.equal(logs[0].args.data, '0x012345', 'value');
    });

    it('should revert account0 safeTransfer token 64 to receiver when onReceived call fails', async function () {
      await assertRevert(token.safeTransferFrom(
        accounts[0], receiver.address, 1), 'TN06');
    });
  });
});
