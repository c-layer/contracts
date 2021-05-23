'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const TokenProxy = artifacts.require('TokenProxy.sol');
const TokenCore = artifacts.require('TokenCore.sol');
const ElasticSupplyTokenDelegate = artifacts.require('ElasticSupplyTokenDelegate.sol');

const AMOUNT = 1000000;
const NULL_ADDRESS = '0x'.padEnd(42, '0');
const NAME = 'Token';
const SYMBOL = 'TKN';
const DECIMALS = 18;
const ELASTICITY_PRECISION = 10 ** 9;

contract('ElasticSupplyTokenDelegate', function (accounts) {
  let core, delegate, token;

  beforeEach(async function () {
    delegate = await ElasticSupplyTokenDelegate.new();
    core = await TokenCore.new('Test', [accounts[0]]);
    await core.defineTokenDelegate(1, delegate.address, []);

    token = await TokenProxy.new(core.address);
    await core.defineToken(
      token.address, 1, NAME, SYMBOL, DECIMALS);
  });

  it('should have no total supply for token', async function () {
    const supply = await token.totalSupply();
    assert.equal(supply.toString(), 0, 'supply');
  });

  it('should have no balance for accounts[0]', async function () {
    const balance = await token.balanceOf(accounts[0]);
    assert.equal(balance.toString(), 0, 'balance');
  });

  it('should have no allowance for accounts[0] to accounts[1]', async function () {
    const allowance = await token.allowance(accounts[0], accounts[1]);
    assert.equal(allowance.toString(), 0, 'allowance');
  });

  it('should have elasticity', async function () {
    const elasticity = await core.elasticity.call(token.address);
    assert.equal(elasticity.toString(), ELASTICITY_PRECISION, 'elasticity');
  });

  it('should prevent non owner to change elasticity', async function () {
    await assertRevert(core.defineElasticity(token.address, String(ELASTICITY_PRECISION),
      { from: accounts[1] }), 'OC03');
  });

  it('should let owner change elasticity', async function () {
    const tx = await core.defineElasticity(token.address, String(1.05 * ELASTICITY_PRECISION));
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'ElasticityUpdated', 'event');
    assert.equal(tx.logs[0].args.value, String(1.05 * ELASTICITY_PRECISION), 'value');
  });

  it('should prevent transferFrom without approval', async function () {
    await assertRevert(token.transferFrom(accounts[0], accounts[2], '1000', { from: accounts[1] }), 'ES03');
  });

  it('should prevent sending too many tokens', async function () {
    await assertRevert(token.transfer(accounts[1], '1'.padEnd(20, '0')), 'ES03');
  });

  it('should prevent sending tokens to null', async function () {
    await assertRevert(token.transfer(NULL_ADDRESS, '1000'), 'ES02');
  });

  it('should let operator mint', async function () {
    const recipients = [accounts[1], accounts[2], accounts[3]];
    const amounts = recipients.map((address, i) => AMOUNT * i);

    const tx = await core.mint(token.address, recipients, amounts);

    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 3);

    const tokenEvents = await token.getPastEvents('allEvents', {
      fromBlock: tx.logs[0].blockNumber,
      toBlock: tx.logs[0].blockNumber,
    });
    assert.equal(tokenEvents.length, 3, 'token events');

    recipients.forEach((address, i) => {
      assert.equal(tx.logs[i].event, 'Minted', 'event');
      assert.equal(tx.logs[i].args.amount, AMOUNT * i, 'amount');
      assert.equal(tokenEvents[i].event, 'Transfer', 'event');
      assert.equal(tokenEvents[i].returnValues.from, NULL_ADDRESS, 'from');
      assert.equal(tokenEvents[i].returnValues.to, address, 'to');
      assert.equal(tokenEvents[i].returnValues.value, AMOUNT * i, 'value');
    });
  });

  it('should prevent operator to mint with inconsistent parameters', async function () {
    await assertRevert(core.mint(token.address, [accounts[1]], []), 'MT04');
  });

  describe('With tokens minted', function () {
    beforeEach(async function () {
      await core.mint(token.address, [accounts[1]], [AMOUNT]);
      await core.mint(token.address, [accounts[2]], [2 * AMOUNT]);
    });

    it('should have a total supply', async function () {
      const supply = await token.totalSupply();
      assert.equal(supply.toString(), 3 * AMOUNT);
    });

    it('should have no balance for accounts[1]', async function () {
      const balance = await token.balanceOf(accounts[1]);
      assert.equal(balance.toString(), AMOUNT, 'balance');
    });

    describe('With operator having some tokens', async function () {
      beforeEach(async function () {
        await token.transfer(accounts[0], AMOUNT, { from: accounts[1] });
      });

      it('should transfer some tokens', async function () {
        const tx = await token.transfer(accounts[1], '1000');
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, 'Transfer', 'event');
        assert.equal(tx.logs[0].args.from, accounts[0], 'from');
        assert.equal(tx.logs[0].args.to, accounts[1], 'to');
        assert.equal(tx.logs[0].args.value, '1000', 'value');
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

      it('should let operator burn some tokens', async function () {
        const tx = await core.burn(token.address, AMOUNT);
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, 'Burned', 'event');
        assert.equal(tx.logs[0].args.token, token.address, 'token');
        assert.equal(tx.logs[0].args.amount, AMOUNT, 'amount');

        const tokenEvents = await token.getPastEvents('allEvents', {
          fromBlock: tx.logs[0].blockNumber,
          toBlock: tx.logs[0].blockNumber,
        });
        assert.equal(tokenEvents.length, 1, 'events');
        assert.equal(tokenEvents[0].event, 'Transfer', 'event');
        assert.equal(tokenEvents[0].returnValues.from, accounts[0], 'to');
        assert.equal(tokenEvents[0].returnValues.to, NULL_ADDRESS, 'from');
        assert.equal(tokenEvents[0].returnValues.value, AMOUNT, 'value');
      });

      it('should prevent operator to burn too many tokens', async function () {
        await assertRevert(core.burn(token.address, AMOUNT + 1), 'MT02');
      });

      it('should prevent non operator to burn any tokens', async function () {
        await assertRevert(core.burn(token.address, 1, { from: accounts[1] }), 'OC03');
      });
    });
  });

  describe('With an elasticity of 2', function () {
    beforeEach(async function () {
      await core.defineElasticity(token.address, 2 * ELASTICITY_PRECISION);
    });

    it('should have no total supply for token', async function () {
      const supply = await token.totalSupply();
      assert.equal(supply.toString(), 0, 'supply');
    });

    it('should have no balance for accounts[0]', async function () {
      const balance = await token.balanceOf(accounts[0]);
      assert.equal(balance.toString(), 0, 'balance');
    });

    it('should have no allowance for accounts[0] to accounts[1]', async function () {
      const allowance = await token.allowance(accounts[0], accounts[1]);
      assert.equal(allowance.toString(), 0, 'allowance');
    });

    it('should have elasticity', async function () {
      const elasticity = await core.elasticity.call(token.address);
      assert.equal(elasticity.toString(), 2 * ELASTICITY_PRECISION, 'elasticity');
    });

    it('should prevent non owner to change elasticity', async function () {
      await assertRevert(core.defineElasticity(token.address, String(ELASTICITY_PRECISION),
        { from: accounts[1] }), 'OC03');
    });

    it('should let owner change elasticity', async function () {
      const tx = await core.defineElasticity(token.address, String(1.05 * ELASTICITY_PRECISION));
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'ElasticityUpdated', 'event');
      assert.equal(tx.logs[0].args.value, String(1.05 * ELASTICITY_PRECISION), 'value');
    });

    it('should let operator mint', async function () {
      const recipients = [accounts[1], accounts[2], accounts[3]];
      const amounts = recipients.map((address, i) => AMOUNT * i);

      const tx = await core.mint(token.address, recipients, amounts);

      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 3);

      const tokenEvents = await token.getPastEvents('allEvents', {
        fromBlock: tx.logs[0].blockNumber,
        toBlock: tx.logs[0].blockNumber,
      });
      assert.equal(tokenEvents.length, 3, 'token events');

      recipients.forEach((address, i) => {
        assert.equal(tx.logs[i].event, 'Minted', 'event');
        assert.equal(tx.logs[i].args.amount.toString(), AMOUNT * i, 'amount');
        assert.equal(tokenEvents[i].event, 'Transfer', 'event');
        assert.equal(tokenEvents[i].returnValues.from, NULL_ADDRESS, 'from');
        assert.equal(tokenEvents[i].returnValues.to, address, 'to');
        assert.equal(tokenEvents[i].returnValues.value.toString(), AMOUNT * i, 'value');
      });
    });

    it('should prevent operator to mint with inconsistent parameters', async function () {
      await assertRevert(core.mint(token.address, [accounts[1]], []), 'MT04');
    });

    describe('With tokens minted', function () {
      beforeEach(async function () {
        await core.mint(token.address, [accounts[1]], [AMOUNT]);
        await core.mint(token.address, [accounts[2]], [2 * AMOUNT]);
      });

      it('should have a total supply', async function () {
        const supply = await token.totalSupply();
        assert.equal(supply.toString(), 3 * AMOUNT);
      });

      it('should have no balance for accounts[1]', async function () {
        const balance = await token.balanceOf(accounts[1]);
        assert.equal(balance.toString(), AMOUNT, 'balance');
      });

      it('should prevent transferFrom without approval', async function () {
        await assertRevert(token.transferFrom(accounts[2], accounts[0], '1000', { from: accounts[1] }), 'ES04');
      });

      it('should prevent sending too many tokens', async function () {
        await assertRevert(token.transfer(accounts[0], '1'.padEnd(20, '0'), { from: accounts[1] }), 'ES03');
      });

      it('should prevent sending tokens to null', async function () {
        await assertRevert(token.transfer(NULL_ADDRESS, '1000', { from: accounts[1] }), 'ES02');
      });

      it('should transfer some tokens', async function () {
        const tx = await token.transfer(accounts[0], '1000', { from: accounts[1] });
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, 'Transfer', 'event');
        assert.equal(tx.logs[0].args.from, accounts[1], 'from');
        assert.equal(tx.logs[0].args.to, accounts[0], 'to');
        assert.equal(tx.logs[0].args.value, '1000', 'value');
      });

      it('should transfer from some tokens with approval', async function () {
        await token.approve(accounts[1], '1000', { from: accounts[2] });
        const tx = await token.transferFrom(accounts[2], accounts[0], '1000', { from: accounts[1] });
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, 'Transfer', 'event');
        assert.equal(tx.logs[0].args.from, accounts[2], 'from');
        assert.equal(tx.logs[0].args.to, accounts[0], 'to');
        assert.equal(tx.logs[0].args.value.toString(), '1000', 'value');
      });

      describe('With operator having some tokens', async function () {
        beforeEach(async function () {
          await token.transfer(accounts[0], AMOUNT, { from: accounts[1] });
        });

        it('should let operator burn some tokens', async function () {
          const tx = await core.burn(token.address, AMOUNT);
          assert.ok(tx.receipt.status, 'Status');
          assert.equal(tx.logs.length, 1);
          assert.equal(tx.logs[0].event, 'Burned', 'event');
          assert.equal(tx.logs[0].args.token, token.address, 'token');
          assert.equal(tx.logs[0].args.amount.toString(), AMOUNT, 'amount');

          const tokenEvents = await token.getPastEvents('allEvents', {
            fromBlock: tx.logs[0].blockNumber,
            toBlock: tx.logs[0].blockNumber,
          });
          assert.equal(tokenEvents.length, 1, 'events');
          assert.equal(tokenEvents[0].event, 'Transfer', 'event');
          assert.equal(tokenEvents[0].returnValues.from, accounts[0], 'to');
          assert.equal(tokenEvents[0].returnValues.to, NULL_ADDRESS, 'from');
          assert.equal(tokenEvents[0].returnValues.value.toString(), AMOUNT, 'value');
        });

        it('should prevent operator to burn too many tokens', async function () {
          await assertRevert(core.burn(token.address, 2 * AMOUNT + 1), 'MT02');
        });

        it('should prevent non operator to burn any tokens', async function () {
          await assertRevert(core.burn(token.address, 1, { from: accounts[1] }), 'OC03');
        });
      });
    });
  });
});
