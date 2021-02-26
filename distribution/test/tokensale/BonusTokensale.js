'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const BonusTokensale = artifacts.require('tokensale/BonusTokensale.sol');
const Token = artifacts.require('mock/TokenERC20Mock.sol');

contract('BonusTokensale', function (accounts) {
  let sale, token;

  const vaultERC20 = accounts[1];
  const vaultETH = accounts[2];
  const tokenPrice = 500;
  const priceUnit = 1;
  const supply = '1000000';
  const start = 4102444800;
  const end = 7258118400;
  const bonuses = ['20', '10'];
  const bonusUntilsEarly = ['5051222400', '6000000000'];
  const bonusUntilsFirst = ['500000', '750000'];
  const invalidBonusUntilsEarly = ['6000000000', '5051222400'];
  const invalidBonusUntilsFirst = ['750000', '500000'];
  const bonusModeNone = 0;
  const bonusModeEarly = 1; /* BonusMode.EARLY */
  const bonusModeFirst = 2;

  beforeEach(async function () {
    token = await Token.new('Name', 'Symbol', 0, accounts[1], 1000000);
    sale = await BonusTokensale.new(
      token.address,
      vaultERC20,
      vaultETH,
      tokenPrice,
      priceUnit,
    );
    await token.approve(sale.address, supply, { from: accounts[1] });
    await sale.updateSchedule(start, end);
  });

  it('should have a token', async function () {
    const tokenAddress = await sale.token();
    assert.equal(tokenAddress, token.address, 'token');
  });

  it('should have a vault ERC20', async function () {
    const saleVaultERC20 = await sale.vaultERC20();
    assert.equal(saleVaultERC20, vaultERC20, 'vaultERC20');
  });

  it('should have a vault ETH', async function () {
    const saleVaultETH = await sale.vaultETH();
    assert.equal(saleVaultETH, vaultETH, 'vaultETH');
  });

  it('should have a token price', async function () {
    const saleTokenPrice = await sale.tokenPrice();
    assert.equal(saleTokenPrice, tokenPrice, 'tokenPrice');
  });

  it('should have no bonuses', async function () {
    const bonuses = await sale.bonuses();
    assert.equal(bonuses[0], bonusModeNone, 'bonusMode');
    assert.equal(bonuses[1].length, 0, 'bonuses');
    assert.equal(bonuses[2].length, 0, 'bonusUntil');
  });

  it('should have no early bonus at 0', async function () {
    const earlyBonus = await sale.earlyBonus(0);
    assert.equal(earlyBonus.bonus, 0, 'earlyBonus');
  });

  it('should have no first bonus at 0', async function () {
    const firstBonus = await sale.firstBonus(0);
    assert.equal(firstBonus.bonus, 0, 'firstBonus');
  });

  it('should have no early bonus before bonus until', async function () {
    const earlyBonus = await sale.earlyBonus(bonusUntilsEarly[1] - 1);
    assert.equal(earlyBonus.bonus, 0, 'earlyBonus');
  });

  it('should have no first bonus boefore bonus until', async function () {
    const firstBonus = await sale.firstBonus(bonusUntilsFirst[1] - 1);
    assert.equal(firstBonus.bonus, 0, 'firstBonus');
  });

  it('should have no early bonus after bonus until', async function () {
    const earlyBonus = await sale.earlyBonus(bonusUntilsEarly[1] + 1);
    assert.equal(earlyBonus.bonus, 0, 'earlyBonus');
  });

  it('should have no first bonus after bonus until', async function () {
    const firstBonus = await sale.firstBonus(bonusUntilsFirst[1] + 1);
    assert.equal(firstBonus.bonus, 0, 'firstBonus');
  });

  it('should prevent non operator to define bonuses', async function () {
    await assertRevert(
      sale.defineBonuses(bonusModeEarly, bonuses, bonusUntilsEarly, { from: accounts[2] }), 'OP01');
  });

  it('should prevent defining mismatching bonuses and bonusUntils', async function () {
    await assertRevert(
      sale.defineBonuses(bonusModeEarly, bonuses, []), 'BT01');
  });

  it('should prevent defining no bonuses if bonus mode is defined', async function () {
    await assertRevert(
      sale.defineBonuses(bonusModeEarly, [], []), 'BT02');
  });

  it('should prevent defining invalid early bonuses', async function () {
    await assertRevert(
      sale.defineBonuses(bonusModeEarly, bonuses, invalidBonusUntilsEarly), 'BT04');
  });

  it('should prevent defining invalid first bonuses', async function () {
    await assertRevert(
      sale.defineBonuses(bonusModeFirst, bonuses, invalidBonusUntilsFirst), 'BT04');
  });

  it('should prevent defining invalid no bonuses', async function () {
    await assertRevert(
      sale.defineBonuses(bonusModeNone, bonuses, bonusUntilsFirst), 'BT05');
  });

  it('should let operator to define no bonuses', async function () {
    const tx = await sale.defineBonuses(bonusModeNone, [], []);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'BonusesDefined', 'event');
    assert.equal(tx.logs[0].args.bonuses.length, 0, 'no BonusesLog');
    assert.equal(tx.logs[0].args.bonusMode, bonusModeNone, 'bonusModeLog');
    assert.equal(tx.logs[0].args.bonusUntils.length, 0, 'bonusUntilLog');

    const bonusesDefined = await sale.bonuses();
    assert.equal(bonusesDefined[0], bonusModeNone, 'no bonuses');
    assert.equal(bonusesDefined[1].length, 0, 'no bonuses');
    assert.equal(bonusesDefined[2].length, 0, 'no bonus untils');
  });

  it('should let operator to define bonuses', async function () {
    const tx = await sale.defineBonuses(bonusModeEarly, bonuses, bonusUntilsEarly);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'BonusesDefined', 'event');
    assert.deepEqual(tx.logs[0].args.bonuses.map((x) => x.toString()), bonuses, 'bonusesLog');
    assert.equal(tx.logs[0].args.bonusMode, bonusModeEarly, 'bonusModeLog');
    assert.deepEqual(tx.logs[0].args.bonusUntils.map((x) => x.toString()), bonusUntilsEarly, 'bonusUntilLog');

    const bonusesDefined = await sale.bonuses();
    assert.equal(bonusesDefined[0], bonusModeEarly, 'no bonuses');
    assert.deepEqual(bonusesDefined[1].map((i) => i.toString()), ['20', '10'], 'bonuses');
    assert.deepEqual(bonusesDefined[2].map((i) => i.toString()), bonusUntilsEarly, 'bonuses');
  });

  describe('during the sale', async function () {
    beforeEach(async function () {
      sale.updateSchedule(0, end);
    });

    it('should prevent operator to define bonuses', async function () {
      await assertRevert(
        sale.defineBonuses(bonusModeEarly, bonuses, bonusUntilsEarly), 'STS01');
    });

    it('should let investor invest', async function () {
      await sale.investETH({ from: accounts[3], value: 1000001 });

      const invested = await sale.investorInvested(accounts[3]);
      assert.equal(invested.toString(), 1000000, 'invested');

      const unspentETH = await sale.investorUnspentETH(accounts[3]);
      assert.equal(unspentETH.toString(), 1, 'unspentETH');

      const tokens = await sale.investorTokens(accounts[3]);
      assert.equal(tokens.toString(), 2000, 'tokens');
    });

    it('should have no early bonuses before bonus until', async function () {
      const earlyBonus = await sale.earlyBonus(bonusUntilsEarly[0] - 1);
      assert.equal(earlyBonus.bonus, 0, 'earlyBonus');
    });

    it('should have no first bonuses at mid sale', async function () {
      const firstBonus = await sale.firstBonus(bonusUntilsFirst[0] - 1);
      assert.equal(firstBonus.bonus, 0, 'firstBonus');
    });
  });

  describe('with early bonuses', async function () {
    beforeEach(async function () {
      await sale.defineBonuses(bonusModeEarly, bonuses, bonusUntilsEarly);
    });

    it('should have no early bonus at 0', async function () {
      const earlyBonus = await sale.earlyBonus(0);
      assert.equal(earlyBonus.bonus, 0, 'earlyBonus');
    });

    it('should have no first bonus at 0', async function () {
      const firstBonus = await sale.firstBonus(0);
      assert.equal(firstBonus.bonus, 0, 'firstBonus');
    });

    it('should have early bonus before bonus in first split', async function () {
      const earlyBonus = await sale.earlyBonus('5000000000');
      assert.equal(earlyBonus.bonus, 20, 'earlyBonus');
    });

    it('should have no first bonus in first split', async function () {
      const firstBonus = await sale.firstBonus('100000');
      assert.equal(firstBonus.bonus, 0, 'firstBonus');
    });

    it('should have early bonus during second split', async function () {
      const earlyBonus = await sale.earlyBonus('5500000000');
      assert.equal(earlyBonus.bonus, 10, 'earlyBonus');
    });

    it('should have no first bonus in second split', async function () {
      const firstBonus = await sale.firstBonus('600000');
      assert.equal(firstBonus.bonus, 0, 'firstBonus');
    });

    it('should have early bonus at bonus until - 0', async function () {
      const earlyBonus = await sale.earlyBonus(bonusUntilsEarly[0]);
      assert.equal(earlyBonus.bonus, 20, 'earlyBonus');
    });

    it('should have no early bonus at bonus until - 1', async function () {
      const earlyBonus = await sale.earlyBonus(bonusUntilsEarly[1]);
      assert.equal(earlyBonus.bonus, 10, 'earlyBonus');
    });

    it('should have no first bonus at bonus until', async function () {
      const firstBonus = await sale.firstBonus(bonusUntilsFirst[0]);
      assert.equal(firstBonus.bonus, 0, 'firstBonus');
    });

    it('should have no early bonus after bonus until', async function () {
      const earlyBonus = await sale.earlyBonus(bonusUntilsEarly[1] + 1);
      assert.equal(earlyBonus.bonus, 0, 'earlyBonus');
    });

    it('should have no first bonus after bonus until', async function () {
      const firstBonus = await sale.firstBonus(bonusUntilsFirst[1] + 1);
      assert.equal(firstBonus.bonus, 0, 'firstBonus');
    });

    it('should have bonus', async function () {
      const bonuses = await sale.bonuses();
      assert.equal(bonuses[0], bonusModeEarly, 'bonusMode');
      assert.deepEqual(bonuses[1].map((x) => x.toString()), ['20', '10'], 'bonusUntils');
      assert.deepEqual(bonuses[2].map((x) => x.toString()), bonusUntilsEarly, 'bonusUntils');
    });

    describe('during the sale', async function () {
      beforeEach(async function () {
        await sale.updateSchedule(0, end);
      });

      it('should have current bonus', async function () {
        const earlyBonus = await sale.tokenBonus('1000');
        assert.equal(earlyBonus.toString(), '200', 'earlyBonus');
      });

      it('should let investor invest', async function () {
        await sale.investETH({ from: accounts[3], value: 1000001 });

        const invested = await sale.investorInvested(accounts[3]);
        assert.equal(invested.toString(), 1000000, 'invested');

        const unspentETH = await sale.investorUnspentETH(accounts[3]);
        assert.equal(unspentETH.toString(), 1, 'unspentETH');

        const tokens = await sale.investorTokens(accounts[3]);
        assert.equal(tokens.toString(), 2400, 'tokens');
      });
    });
  });

  describe('with first bonuses', async function () {
    beforeEach(async function () {
      await sale.defineBonuses(bonusModeFirst, bonuses, bonusUntilsFirst);
    });

    it('should have no early bonus at 0', async function () {
      const earlyBonus = await sale.earlyBonus(0);
      assert.equal(earlyBonus.bonus, 0, 'earlyBonus');
    });

    it('should have first bonus at 0', async function () {
      const firstBonus = await sale.firstBonus(0);
      assert.equal(firstBonus.bonus, 20, 'firstBonus');
      assert.equal(firstBonus.remainingAtBonus, '500000', 'remaining');
    });

    it('should have early bonus before bonus in first split', async function () {
      const earlyBonus = await sale.earlyBonus('5000000000');
      assert.equal(earlyBonus.bonus, 0, 'earlyBonus');
    });

    it('should have no first bonus in first split', async function () {
      const firstBonus = await sale.firstBonus('100000');
      assert.equal(firstBonus.bonus, 20, 'firstBonus');
      assert.equal(firstBonus.remainingAtBonus, '400000', 'remainig');
    });

    it('should have no early bonus during second split', async function () {
      const earlyBonus = await sale.earlyBonus('5000000000');
      assert.equal(earlyBonus.bonus, 0, 'earlyBonus');
    });

    it('should have first bonus in second split', async function () {
      const firstBonus = await sale.firstBonus('500001');
      assert.equal(firstBonus.bonus.toString(), '10', 'firstBonus');
      assert.equal(firstBonus.remainingAtBonus, '249999', 'remainig');
    });

    it('should have no early bonus at bonus until - 0', async function () {
      const earlyBonus = await sale.earlyBonus(bonusUntilsEarly[0]);
      assert.equal(earlyBonus.bonus, 0, 'earlyBonus');
    });

    it('should have no early bonus at bonus until - 1', async function () {
      const earlyBonus = await sale.earlyBonus(bonusUntilsEarly[1]);
      assert.equal(earlyBonus.bonus, 0, 'earlyBonus');
    });

    it('should have first bonus at bonus until - 0', async function () {
      const firstBonus = await sale.firstBonus(bonusUntilsFirst[0]);
      assert.equal(firstBonus.bonus, 10, 'firstBonus');
      assert.equal(firstBonus.remainingAtBonus, '250000', 'remainig');
    });

    it('should have no first bonus at bonus until', async function () {
      const firstBonus = await sale.firstBonus(bonusUntilsFirst[1]);
      assert.equal(firstBonus.bonus, 0, 'firstBonus');
    });

    it('should have no early bonus after bonus until', async function () {
      const earlyBonus = await sale.earlyBonus(bonusUntilsEarly[1] + 1);
      assert.equal(earlyBonus.bonus, 0, 'earlyBonus');
    });

    it('should have no first bonus after bonus until', async function () {
      const firstBonus = await sale.firstBonus(bonusUntilsFirst[1] + 1);
      assert.equal(firstBonus.bonus, 0, 'firstBonus');
    });

    it('should have bonus mode', async function () {
      const bonuses = await sale.bonuses();
      assert.equal(bonuses[0], bonusModeFirst, 'bonusMode');
      assert.deepEqual(bonuses[1].map((x) => x.toString()), ['20', '10'], 'bonuses');
      assert.deepEqual(bonuses[2].map((x) => x.toString()), bonusUntilsFirst, 'bonusUntil');
    });

    describe('during the sale', async function () {
      beforeEach(async function () {
        sale.updateSchedule(0, end);
      });

      it('should have current bonus', async function () {
        const firstBonus = await sale.tokenBonus('1000');
        assert.equal(firstBonus.toString(), '200', 'firstBonus');
      });

      it('should let investor invest', async function () {
        await sale.investETH({ from: accounts[3], value: 1000001 });

        const invested = await sale.investorInvested(accounts[3]);
        assert.equal(invested.toString(), 1000000, 'invested');

        const unspentETH = await sale.investorUnspentETH(accounts[3]);
        assert.equal(unspentETH.toString(), 1, 'unspentETH');

        const tokens = await sale.investorTokens(accounts[3]);
        assert.equal(tokens.toString(), 2400, 'tokens');
      });

      it('should let investor invest and fill the first bonus', async function () {
        await sale.investETH({ from: accounts[3], value: 250005001 });

        const invested = await sale.investorInvested(accounts[3]);
        assert.equal(invested.toString(), 250005000, 'invested');

        const unspentETH = await sale.investorUnspentETH(accounts[3]);
        assert.equal(unspentETH.toString(), 1, 'unspentETH');

        const tokens = await sale.investorTokens(accounts[3]);
        assert.equal(tokens.toString(), 600011, 'tokens');
      });

      it('should let investor invest and fill all bonuses', async function () {
        await sale.investETH({ from: accounts[3], value: 400000001 });

        const invested = await sale.investorInvested(accounts[3]);
        assert.equal(invested.toString(), 400000000, 'invested');

        const unspentETH = await sale.investorUnspentETH(accounts[3]);
        assert.equal(unspentETH.toString(), 1, 'unspentETH');

        const tokens = await sale.investorTokens(accounts[3]);
        assert.equal(tokens.toString(), 925000, 'tokens');
      });
    });
  });
});
