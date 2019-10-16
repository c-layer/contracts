"user strict";

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const BonusTokensale = artifacts.require("tokensale/BonusTokensale.sol");
const Token = artifacts.require("util/token/TokenERC20.sol");

contract("BonusTokensale", function (accounts) {
  let sale, token;
 
  const vaultERC20 = accounts[1];
  const vaultETH = accounts[2];
  const tokenPrice = 500;
  const supply = "1000000";
  const start = 4102444800;
  const end = 7258118400;
  const bonuses = ["20", "10"];
  const bonusUntilEarly = 6000000000;
  const bonusUntilFirst = "500000";
  const bonusModeEarly = 0; /* BonusMode.EARLY */
  const bonusModeFirst = 1;

  beforeEach(async function () {
    token = await Token.new("Name", "Symbol", 0, accounts[1], 1000000);
    sale = await BonusTokensale.new(
      token.address,
      vaultERC20,
      vaultETH,
      tokenPrice
    );
    await token.approve(sale.address, supply, { from: accounts[1] });
    await sale.updateSchedule(start, end);
  });

  it("should have a token", async function () {
    const tokenAddress = await sale.token();
    assert.equal(tokenAddress, token.address, "token");
  });

  it("should have a vault ERC20", async function () {
    const saleVaultERC20 = await sale.vaultERC20();
    assert.equal(saleVaultERC20, vaultERC20, "vaultERC20");
  });

  it("should have a vault ETH", async function () {
    const saleVaultETH = await sale.vaultETH();
    assert.equal(saleVaultETH, vaultETH, "vaultETH");
  });

  it("should have a token price", async function () {
    const saleTokenPrice = await sale.tokenPrice();
    assert.equal(saleTokenPrice, tokenPrice, "tokenPrice");
  });

  it("should have bonus mode", async function () {
    const bonusMode = await sale.bonusMode();
    assert.equal(bonusMode, bonusModeEarly, "bonusMode");
  });

  it("should have bonus until", async function () {
    const bonusUntil = await sale.bonusUntil();
    assert.equal(bonusUntil, 0, "bonusUntil");
  });

  it("should have no early bonus at 0", async function () {
    const earlyBonus = await sale.earlyBonus(0);
    assert.equal(earlyBonus, 0, "earlyBonus");
  });

  it("should have no first bonus at 0", async function () {
    const firstBonus = await sale.firstBonus(0);
    assert.equal(firstBonus, 0, "firstBonus");
  });

  it("should have no early bonus before bonus until", async function () {
    const earlyBonus = await sale.earlyBonus(bonusUntilEarly - 1);
    assert.equal(earlyBonus, 0, "earlyBonus");
  });

  it("should have no first bonus boefore bonus until", async function () {
    const firstBonus = await sale.firstBonus(bonusUntilFirst - 1);
    assert.equal(firstBonus, 0, "firstBonus");
  });

  it("should have no early bonus after bonus until", async function () {
    const earlyBonus = await sale.earlyBonus(bonusUntilEarly + 1);
    assert.equal(earlyBonus, 0, "earlyBonus");
  });

  it("should have no first bonus after bonus until", async function () {
    const firstBonus = await sale.firstBonus(bonusUntilFirst + 1);
    assert.equal(firstBonus, 0, "firstBonus");
  });

  it("should prevent non operator to define bonuses", async function () {
    await assertRevert(
      sale.defineBonuses(bonuses, bonusModeEarly, bonusUntilEarly, { from: accounts[2] }), "OP01");
  });

  it("should let operator to define bonuses", async function () {
    const tx = await sale.defineBonuses(bonuses, bonusModeEarly, bonusUntilEarly);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "BonusesDefined", "event");
    assert.deepEqual(tx.logs[0].args.bonuses.map((x) => x.toString()), bonuses, "bonusesLog");
    assert.equal(tx.logs[0].args.bonusMode, bonusModeEarly, "bonusModeLog");
    assert.equal(tx.logs[0].args.bonusUntil, bonusUntilEarly, "bonusUntilLog");
    
    const bonusesDefined = await sale.bonuses();
    assert.deepEqual(bonusesDefined.map((i) => i.toString()), ["20", "10"], "bonuses");
  });

  describe("during the sale", async function () {
    beforeEach(async function () {
      sale.updateSchedule(0, end);
    });

    it("should prevent operator to define bonuses", async function () {
      await assertRevert(
        sale.defineBonuses(bonuses, bonusModeEarly, bonusUntilEarly), "STS01");
    });

    it("should let investor invest", async function () {
      await sale.investETH({ from: accounts[3], value: 1000001 });

      const invested = await sale.investorInvested(accounts[3]);
      assert.equal(invested.toString(), 1000000, "invested");
      
      const unspentETH = await sale.investorUnspentETH(accounts[3]);
      assert.equal(unspentETH.toString(), 1, "unspentETH");
      
      const tokens = await sale.investorTokens(accounts[3]);
      assert.equal(tokens.toString(), 2000, "tokens");
    });

    it("should have no early bonus before bonus until", async function () {
      const earlyBonus = await sale.earlyBonus(bonusUntilEarly - 1);
      assert.equal(earlyBonus, 0, "earlyBonus");
    });

    it("should have no first bonus at mid sale", async function () {
      const firstBonus = await sale.firstBonus(bonusUntilFirst - 1);
      assert.equal(firstBonus, 0, "firstBonus");
    });
  });

  describe("with early bonuses", async function () {
    beforeEach(async function () {
      await sale.defineBonuses(bonuses, bonusModeEarly, bonusUntilEarly);
    });

    it("should have no early bonus at 0", async function () {
      const earlyBonus = await sale.earlyBonus(0);
      assert.equal(earlyBonus, 0, "earlyBonus");
    });

    it("should have no first bonus at 0", async function () {
      const firstBonus = await sale.firstBonus(0);
      assert.equal(firstBonus, 0, "firstBonus");
    });

    it("should have early bonus before bonus in first spit", async function () {
      const earlyBonus = await sale.earlyBonus(5000000000);
      assert.equal(earlyBonus, 20, "earlyBonus");
    });

    it("should have no first bonus in first spit", async function () {
      const firstBonus = await sale.firstBonus("100000");
      assert.equal(firstBonus, 0, "firstBonus");
    });

    it("should have early bonus during second spit", async function () {
      const earlyBonus = await sale.earlyBonus(5500000000);
      assert.equal(earlyBonus, 10, "earlyBonus");
    });

    it("should have no first bonus in second spit", async function () {
      const firstBonus = await sale.firstBonus("600000");
      assert.equal(firstBonus, 0, "firstBonus");
    });

    it("should have no early bonus at bonus until", async function () {
      const earlyBonus = await sale.earlyBonus(bonusUntilEarly);
      assert.equal(earlyBonus, 0, "earlyBonus");
    });

    it("should have no first bonus at bonus until", async function () {
      const firstBonus = await sale.firstBonus(bonusUntilFirst);
      assert.equal(firstBonus, 0, "firstBonus");
    });

    it("should have no early bonus after bonus until", async function () {
      const earlyBonus = await sale.earlyBonus(bonusUntilEarly + 1);
      assert.equal(earlyBonus, 0, "earlyBonus");
    });

    it("should have no first bonus after bonus until", async function () {
      const firstBonus = await sale.firstBonus(bonusUntilFirst + 1);
      assert.equal(firstBonus, 0, "firstBonus");
    });
 
    it("should have bonus mode", async function () {
      const bonusMode = await sale.bonusMode();
      assert.equal(bonusMode, bonusModeEarly, "bonusMode");
    });

    it("should have bonus until", async function () {
      const bonusUntil = await sale.bonusUntil();
      assert.equal(bonusUntil, bonusUntilEarly, "bonusUntil");
    });

    describe("during the sale", async function () {
      beforeEach(async function () {
        sale.updateSchedule(0, end);
      });

      it("should have current bonus", async function () {
        const earlyBonus = await sale.currentBonus();
        assert.equal(earlyBonus, 20, "earlyBonus");
      });

      it("should let investor invest", async function () {
        await sale.investETH({ from: accounts[3], value: 1000001 });

        const invested = await sale.investorInvested(accounts[3]);
        assert.equal(invested.toString(), 1000000, "invested");
      
        const unspentETH = await sale.investorUnspentETH(accounts[3]);
        assert.equal(unspentETH.toString(), 1, "unspentETH");
      
        const tokens = await sale.investorTokens(accounts[3]);
        assert.equal(tokens.toString(), 2400, "tokens");
      });
    });
  });

  describe("with first bonuses", async function () {
    beforeEach(async function () {
      await sale.defineBonuses(bonuses, bonusModeFirst, bonusUntilFirst);
    });

    it("should have no early bonus at 0", async function () {
      const earlyBonus = await sale.earlyBonus(0);
      assert.equal(earlyBonus, 0, "earlyBonus");
    });

    it("should have first bonus at 0", async function () {
      const firstBonus = await sale.firstBonus(0);
      assert.equal(firstBonus, 20, "firstBonus");
    });

    it("should have early bonus before bonus in first spit", async function () {
      const earlyBonus = await sale.earlyBonus(5000000000);
      assert.equal(earlyBonus, 0, "earlyBonus");
    });

    it("should have no first bonus in first spit", async function () {
      const firstBonus = await sale.firstBonus("100000");
      assert.equal(firstBonus, 20, "firstBonus");
    });

    it("should have no early bonus during second spit", async function () {
      const earlyBonus = await sale.earlyBonus(5000000000);
      assert.equal(earlyBonus, 0, "earlyBonus");
    });

    it("should have first bonus in second spit", async function () {
      const firstBonus = await sale.firstBonus("400000");
      assert.equal(firstBonus, 10, "firstBonus");
    });

    it("should have no early bonus at bonus until", async function () {
      const earlyBonus = await sale.earlyBonus(bonusUntilEarly);
      assert.equal(earlyBonus, 0, "earlyBonus");
    });

    it("should have no first bonus at bonus until", async function () {
      const firstBonus = await sale.firstBonus(bonusUntilFirst);
      assert.equal(firstBonus, 0, "firstBonus");
    });

    it("should have no early bonus after bonus until", async function () {
      const earlyBonus = await sale.earlyBonus(bonusUntilEarly + 1);
      assert.equal(earlyBonus, 0, "earlyBonus");
    });

    it("should have no first bonus after bonus until", async function () {
      const firstBonus = await sale.firstBonus(bonusUntilFirst + 1);
      assert.equal(firstBonus, 0, "firstBonus");
    });
 
    it("should have bonus mode", async function () {
      const bonusMode = await sale.bonusMode();
      assert.equal(bonusMode, bonusModeFirst, "bonusMode");
    });

    it("should have bonus until", async function () {
      const bonusUntil = await sale.bonusUntil();
      assert.equal(bonusUntil, bonusUntilFirst, "bonusUntil");
    });

    describe("during the sale", async function () {
      beforeEach(async function () {
        sale.updateSchedule(0, end);
      });

      it("should have current bonus", async function () {
        const firstBonus = await sale.currentBonus();
        assert.equal(firstBonus, 20, "firstBonus");
      });

      it("should let investor invest", async function () {
        await sale.investETH({ from: accounts[3], value: 1000001 });

        const invested = await sale.investorInvested(accounts[3]);
        assert.equal(invested.toString(), 1000000, "invested");
      
        const unspentETH = await sale.investorUnspentETH(accounts[3]);
        assert.equal(unspentETH.toString(), 1, "unspentETH");
      
        const tokens = await sale.investorTokens(accounts[3]);
        assert.equal(tokens.toString(), 2400, "tokens");
      });
    });
  });
});
