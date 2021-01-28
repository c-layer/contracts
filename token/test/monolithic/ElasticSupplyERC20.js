'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const ElasticSupplyERC20 = artifacts.require('ElasticSupplyERC20.sol');

const NAME = 'name';
const SYMBOL = 'SYM';
const DECIMALS = '18';
const TOTAL_SUPPLY = '20000000';
const NULL_ADDRESS = '0x'.padEnd(42, '0');

const ELASTICITY_PRECISION = 10 ** 9;

contract('ElasticSupplyERC20', function (accounts) {
  let token;

  beforeEach(async function () {
    token = await ElasticSupplyERC20.new(NAME, SYMBOL, DECIMALS, accounts[0], TOTAL_SUPPLY);
  });

  it('should have an elasticity', async function () {
    const elasticity = await token.elasticity();
    assert.equal(elasticity.toString(), ELASTICITY_PRECISION, 'elasticity');
  });

  it('should have a total supply', async function () {
    const totalSupply = await token.totalSupply();
    assert.equal(totalSupply.toString(), TOTAL_SUPPLY, 'totalSupply');
  });

  it('should have a balance for accounts 0', async function () {
    const balance = await token.balanceOf(accounts[0]);
    assert.equal(balance.toString(), TOTAL_SUPPLY, 'balance');
  });

  it('should prevent non owner to change elasticity', async function () {
    await assertRevert(token.defineElasticity(String(ELASTICITY_PRECISION), { from: accounts[1] }), 'OW01');
  });

  it('should let owner change elasticity', async function () {
    const tx = await token.defineElasticity(String(1.05 * ELASTICITY_PRECISION));
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'ElasticityUpdate', 'event');
    assert.equal(tx.logs[0].args.value, String(1.05 * ELASTICITY_PRECISION), 'value');
  });

  it('should prevent transferFrom without approval', async function () {
    await assertRevert(token.transferFrom(accounts[0], accounts[2], '1000', { from: accounts[1] }), 'ES03');
  });

  it('should prevent sending too many tokens', async function () {
    await assertRevert(token.transfer(accounts[1], '1'.padEnd(20, '0')), 'ES04');
  });

  it('should prevent sending tokens to null', async function () {
    await assertRevert(token.transfer(NULL_ADDRESS, '1000'), 'ES02');
  });

  it('should transfer some tokens', async function () {
    const tx = await token.transfer(accounts[1], '2100000');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Transfer', 'event');
    assert.equal(tx.logs[0].args.from, accounts[0], 'from');
    assert.equal(tx.logs[0].args.to, accounts[1], 'to');
    assert.equal(tx.logs[0].args.value, '2100000', 'value');
  });

  it('should transfer from some tokens with approval', async function () {
    await token.approve(accounts[1], '1000');
    const tx = await token.transferFrom(accounts[0], accounts[2], '1000', { from: accounts[1] });
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Transfer', 'event');
    assert.equal(tx.logs[0].args.from, accounts[0], 'from');
    assert.equal(tx.logs[0].args.to, accounts[2], 'to');
    assert.equal(tx.logs[0].args.value, '1000', 'value');
  });

  describe('with tokens transfered from', function () {
    beforeEach(async function () {
      await token.approve(accounts[1], '10000');
      await token.transferFrom(accounts[0], accounts[2], '1000', { from: accounts[1] });
    });

    it('should have allowance reduce', async function () {
      const allowance = await token.allowance(accounts[0], accounts[1]);
      assert.equal(allowance.toString(), '9000', 'allowance');
    });
  });

  describe('with elasticity increased by 5%', function () {
    beforeEach(async function () {
      await token.defineElasticity(String(1.05 * ELASTICITY_PRECISION));
    });

    it('should have an elasticity', async function () {
      const elasticity = await token.elasticity();
      assert.equal(elasticity.toString(), '1050000000', 'elasticity');
    });

    it('should have a total supply', async function () {
      const totalSupply = await token.totalSupply();
      assert.equal(totalSupply.toString(), '21000000', 'totalSupply');
    });

    it('should have a balance for account 0', async function () {
      const balance = await token.balanceOf(accounts[0]);
      assert.equal(balance.toString(), '21000000', 'balance');
    });

    describe('with tokens transferred', async function () {
      beforeEach(async function () {
        await token.transfer(accounts[1], '750000');
      });

      it('should have a balance for account 0', async function () {
        const balance = await token.balanceOf(accounts[0]);
        assert.equal(balance.toString(), '20250000', 'balance');
      });

      it('should have a balance for account 1', async function () {
        const balance = await token.balanceOf(accounts[1]);
        assert.equal(balance.toString(), '749999', 'balance');
      });

      describe('with an elasticity back to normal', function () {
        beforeEach(async function () {
          await token.defineElasticity(String(ELASTICITY_PRECISION));
        });

        it('should have an elasticity', async function () {
          const elasticity = await token.elasticity();
          assert.equal(elasticity.toString(), String(ELASTICITY_PRECISION), 'elasticity');
        });

        it('should have a total supply', async function () {
          const totalSupply = await token.totalSupply();
          assert.equal(totalSupply.toString(), TOTAL_SUPPLY, 'totalSupply');
        });

        it('should have a balance for account 0', async function () {
          const balance = await token.balanceOf(accounts[0]);
          assert.equal(balance.toString(), '19285715', 'balance');
        });

        it('should have a balance for account 1', async function () {
          const balance = await token.balanceOf(accounts[1]);
          assert.equal(balance.toString(), '714285', 'balance');
        });
      });
    });
  });
});
