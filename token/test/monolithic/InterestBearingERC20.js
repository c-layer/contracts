'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const assertTime = require('../helpers/assertTime');
const BN = require('bn.js');
const InterestBearingERC20 = artifacts.require('InterestBearingERC20.sol');
const InterestBearingERC20Mock = artifacts.require('InterestBearingERC20Mock.sol');

const NAME = 'name';
const SYMBOL = 'SYM';
const DECIMALS = '18';
const TOTAL_SUPPLY = '10000000';

const PERIOD = 24 * 365.25 * 3600;
const ELASTICITY_PRECISION = 10 ** 9;

contract('InterestBearingERC20', function (accounts) {
  let token;
  let from;

  describe('with a token', function () {
    beforeEach(async function () {
      token = await InterestBearingERC20.new(NAME, SYMBOL, DECIMALS, accounts[0], TOTAL_SUPPLY);
      from = await web3.eth.getBlock('latest').then((block) => block.timestamp);
    });

    it('should have no interest', async function () {
      const interest = await token.interest();
      assert.equal(interest.rate.toString(), String(ELASTICITY_PRECISION), 'no rate');
      assertTime(interest.from.toNumber(), from, 'from');
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

    it('should prevent non owner to define interest', async function () {
      await assertRevert(token.defineInterest(1, { from: accounts[1] }), 'OW01');
    });

    it('should prevent have undefined interest', async function () {
      await assertRevert(token.defineInterest(0), 'IB02');
    });

    it('should let add interest', async function () {
      const tx = await token.defineInterest(1);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'InterestUpdate', 'event');
      assert.equal(tx.logs[0].args.rate.toString(), 1, 'value');
      assert.equal(tx.logs[0].args.elasticity.toString(), String(ELASTICITY_PRECISION), 'value');
    });
  });

  describe('with mocked token', function () {
    beforeEach(async function () {
      token = await InterestBearingERC20Mock.new(NAME, SYMBOL, DECIMALS, accounts[0], TOTAL_SUPPLY);
      from = await web3.eth.getBlock('latest').then((block) => block.timestamp);
    });

    describe('and an interest rate of +5% per year', function () {
      beforeEach(async function () {
        const tx = await token.defineInterest(String(1.05 * ELASTICITY_PRECISION));
        from = await web3.eth.getBlock(tx.receipt.blockNumber).then((block) => block.timestamp);
        await token.defineTestingTimes(from, String(from));
      });

      it('should have interest defined', async function () {
        const interest = await token.interest();
        assert.equal(interest.rate.toString(), '1050000000', 'no rate');
        assert.equal(interest.from.toString(), from, 'since day 0');
      });

      it('should have an elasticity at 3, 6, 9 and 12 months', async function () {
        const elastictyAts = await Promise.all([7889400, 15778800, 23668200, 31557600].map((at) => {
          return token.elasticityAt(from + at).then((elasticity) => elasticity.toString());
        }));

        assert.deepEqual(elastictyAts, ['1012500000', '1025000000', '1037500000', '1050000000'], 'elasticity');
      });

      it('should not rebase too early', async function () {
        const tx = await token.rebaseInterest();
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 0);
      });

      it('should not rebase during the transfer', async function () {
        const tx = await token.transfer(accounts[1], '750000');
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, 'Transfer', 'event1');
        assert.equal(tx.logs[0].args.from.toString(), accounts[0], 'from');
        assert.equal(tx.logs[0].args.to.toString(), accounts[1], 'to');
        assert.equal(tx.logs[0].args.value.toString(), '750000', 'from');
      });

      describe('after a year rebase', function () {
        beforeEach(async function () {
          await token.defineTestingTimes(from, String(from - PERIOD));
        });

        it('should rebase once', async function () {
          const tx = await token.rebaseInterest();
          assert.ok(tx.receipt.status, 'Status');
          assert.equal(tx.logs.length, 1);
          assert.equal(tx.logs[0].event, 'InterestRebase', 'event');
          assertTime(tx.logs[0].args.at.toNumber(), from, 'at');
          assert.equal(tx.logs[0].args.elasticity.toString(), '1050000000', 'elasticity');
        });

        it('should let add interest', async function () {
          const tx = await token.defineInterest(1);
          assert.ok(tx.receipt.status, 'Status');
          assert.equal(tx.logs.length, 2);
          assert.equal(tx.logs[0].event, 'InterestRebase', 'event1');
          assertTime(tx.logs[0].args.at.toNumber(), (from), 'at');
          assert.equal(tx.logs[0].args.elasticity.toString(), '1050000000', 'elasticity1');
          assert.equal(tx.logs[1].event, 'InterestUpdate', 'event2');
          assert.equal(tx.logs[1].args.rate.toString(), 1, 'rate');
          assert.equal(tx.logs[1].args.elasticity.toString(), '1050000000', 'elasticity2');
        });

        it('should rebase during the transfer', async function () {
          const tx = await token.transfer(accounts[1], '750000');
          assert.ok(tx.receipt.status, 'Status');
          assert.equal(tx.logs.length, 2);
          assert.equal(tx.logs[0].event, 'InterestRebase', 'event1');
          assertTime(tx.logs[0].args.at.toNumber(), String(from), 'at');
          assert.equal(tx.logs[0].args.elasticity.toString(), '1050000000', 'elasticity1');
          assert.equal(tx.logs[1].event, 'Transfer', 'event1');
          assert.equal(tx.logs[1].args.from.toString(), accounts[0], 'from');
          assert.equal(tx.logs[1].args.to.toString(), accounts[1], 'to');
          assert.equal(tx.logs[1].args.value.toString(), '750000', 'from');
        });
      });

      describe('after one and half year rebase', function () {
        beforeEach(async function () {
          await token.defineTestingTimes(from, String(from - 3 * PERIOD / 2));
        });

        it('should rebase once', async function () {
          const tx = await token.rebaseInterest();
          assert.ok(tx.receipt.status, 'Status');
          assert.equal(tx.logs.length, 1);
          assert.equal(tx.logs[0].event, 'InterestRebase', 'event');
          assertTime(tx.logs[0].args.at.toNumber(), (from - PERIOD / 2), 'at');
          assert.equal(tx.logs[0].args.elasticity.toString(), '1050000000', 'elasticity');
        });

        it('should let add interest', async function () {
          const tx = await token.defineInterest(1);
          const interest = 1076250000;

          assert.ok(tx.receipt.status, 'Status');
          assert.equal(tx.logs.length, 3);

          assert.equal(tx.logs[0].event, 'InterestRebase', 'event');
          assertTime(tx.logs[0].args.at.toNumber(), (from - PERIOD / 2), 'at1');
          assert.equal(tx.logs[0].args.elasticity.toString(), '1050000000', 'elasticity1');

          assert.equal(tx.logs[1].event, 'InterestRebase', 'event');
          assertTime(tx.logs[1].args.at.toNumber(), from, 'at2');
          assert.equal(tx.logs[1].args.elasticity.toString(), String(interest), 'elasticity2');

          assert.equal(tx.logs[2].event, 'InterestUpdate', 'event');
          assert.equal(tx.logs[2].args.rate.toString(), 1, 'value');
          assert.equal(tx.logs[2].args.elasticity.toString(), String(interest), 'value');
        });
      });

      describe('after two years rebase', function () {
        beforeEach(async function () {
          await token.defineTestingTimes(from, String(from - 2 * PERIOD));
        });

        it('should rebase twice', async function () {
          const tx = await token.rebaseInterest();
          assert.ok(tx.receipt.status, 'Status');
          assert.equal(tx.logs.length, 2);
          assert.equal(tx.logs[0].event, 'InterestRebase', 'event1');
          assertTime(tx.logs[0].args.at.toNumber(), (from - PERIOD), 'at1');
          assert.equal(tx.logs[0].args.elasticity.toString(), '1050000000', 'elasticity1');
          assert.equal(tx.logs[1].event, 'InterestRebase', 'event2');
          assertTime(tx.logs[1].args.at.toNumber(), from, 'at2');
          assert.equal(tx.logs[1].args.elasticity.toString(), '1102500000', 'elasticity2');
        });
      });

      describe('after twenty years rebase', function () {
        beforeEach(async function () {
          await token.defineTestingTimes(from, String(from - 20 * PERIOD));
        });

        it('should rebase ten times', async function () {
          const tx = await token.rebaseInterest();
          assert.ok(tx.receipt.status, 'Status');
          assert.equal(tx.logs.length, 10);

          let elasticity = new BN('1000000000');
          const elasticities = [];
          for (let i = 0; i < 10; i++) {
            elasticity = elasticity.mul(new BN('105')).div(new BN('100'));
            elasticities.push({
              at: String(from - 20 * PERIOD + (i + 1) * PERIOD),
              elasticity: elasticity.toString(),
            });
          }

          assert.deepEqual(
            tx.logs.map((log) => ({ at: log.args.at.toString(), elasticity: log.args.elasticity.toString() })),
            elasticities,
            'elasticities');
        });

        it('should prevent adding interest', async function () {
          await assertRevert(token.defineInterest(1), 'IB03');
        });
      });

      describe('with a new interest rate of +3% per year', function () {
        beforeEach(async function () {
          const tx = await token.defineInterest(String(1.03 * ELASTICITY_PRECISION));
          from = await web3.eth.getBlock(tx.receipt.blockNumber).then((block) => block.timestamp);
          await token.defineTestingTimes(from, String(from));
        });

        it('should have interest defined', async function () {
          const interest = await token.interest();
          assert.equal(interest.rate.toString(), '1030000000', 'no rate');
          assert.equal(interest.from.toString(), from, 'since day 0');
        });

        it('should have an elasticity at 3, 6, 9 and 12 months', async function () {
          const elastictyAts = await Promise.all([7889400, 15778800, 23668200, 31557600].map((at) => {
            return token.elasticityAt(from + at).then((elasticity) => elasticity.toString());
          }));

          assert.deepEqual(elastictyAts, ['1007500000', '1015000000', '1022500000', '1030000000'], 'elasticity');
        });
      });
    });

    describe('and an interest rate of -5% per year', function () {
      beforeEach(async function () {
        const tx = await token.defineInterest(String(0.95 * ELASTICITY_PRECISION));
        from = await web3.eth.getBlock(tx.receipt.blockNumber).then((block) => block.timestamp);
        await token.defineTestingTimes(from, String(from));
      });

      it('should have interest defined', async function () {
        const interest = await token.interest();
        assert.equal(interest.rate.toString(), '950000000', 'no rate');
        assert.equal(interest.from.toString(), from, 'since day 0');
      });

      it('should have an elasticity at 3, 6, 9 and 12 months', async function () {
        const elastictyAts = await Promise.all([7889400, 15778800, 23668200, 31557600].map((at) => {
          return token.elasticityAt(from + at).then((elasticity) => elasticity.toString());
        }));

        assert.deepEqual(elastictyAts, ['987500000', '975000000', '962500000', '950000000'], 'elasticity');
      });
    });
  });
});
