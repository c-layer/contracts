'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require('./helpers/assertRevert');
const PricesFeed = artifacts.require('PricesFeed.sol');

contract('PricesFeed', function (accounts) {
  let priceFeed;

  beforeEach(async function () {
    priceFeed = await PricesFeed.new();
  });

  it('should have no updatedAt', async function () {
    const updatedAt = await priceFeed.updatedAt();
    assert.equal(updatedAt.toString(), '0', 'updatedAt');
  });

  it('should privent non operator to define prices', async function () {
    await assertRevert(
      priceFeed.definePrices(
        [ accounts[0], accounts[1], accounts[2] ],
        [ '100000', '20000', '300333' ],
        { from: accounts[1] },
      ), 'OP01');
  });

  it('should let operator to update prices', async function () {
    const tx = await priceFeed.definePrices([ accounts[0], accounts[1], accounts[2] ], [ '100000', '20000', '300333' ]);
    assert.ok(tx.receipt.status, 'Status');
  });

  describe('With prices defined', function () {
    beforeEach(async function () {
      await priceFeed.definePrices([ accounts[0], accounts[1], accounts[2] ], [ '100000', '20000', '300333' ]);
    });

    it('should have updatedAt', async function () {
      const latestBlock = await web3.eth.getBlock('latest');
      const updatedAt = await priceFeed.updatedAt();
      assert.equal(updatedAt.toString(), latestBlock.timestamp, 'updatedAt');
    });

    it('should prevent non operator to update prices', async function () {
      await assertRevert(
        priceFeed.updatePrices([ '100000', '20000', '300333' ], { from: accounts[1] }), 'OP01');
    });

    it('should let operator to update prices', async function () {
      const tx = await priceFeed.updatePrices([ '100000', '20000', '300333' ]);
      assert.ok(tx.receipt.status, 'Status');
    });

    it('should let convert prices', async function () {
      const price = await priceFeed.convert(accounts[0], accounts[1], 100);
      assert.equal(price.toString(), '20', 'price');
    });
  });
});
