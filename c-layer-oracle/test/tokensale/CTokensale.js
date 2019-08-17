"user strict";

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const CTokensale = artifacts.require("tokensale/CTokensale.sol");
const Token = artifacts.require("util/token/TokenERC20.sol");
const UserRegistry = artifacts.require("UserRegistry.sol");
const RatesProvider = artifacts.require("RatesProvider.sol");
const BN = require("bn.js");

contract("CTokensale", function (accounts) {
  let sale, token, userRegistry, ratesProvider;
  let rateWEICHF;
 
  const CHF = web3.utils.toHex("CHF");
  const KYC_LEVEL_KEY = 0;

  const vaultERC20 = accounts[1];
  const vaultETH = accounts[2];
  const tokenPrice = 500;
  const priceUnit = 1;
  const supply = "1000000";
  const dayPlusOneTime = Math.floor((new Date()).getTime() / 1000) + 3600 * 24;

  const start = 4102444800;
  const end = 7258118400;
  const bonuses = [ 10 ];
  const bonusUntil = end;

  before(async function () {
    userRegistry = await UserRegistry.new(
      "Dummy", CHF,
      [ accounts[1], accounts[2], accounts[3], accounts[4], accounts[5], accounts[6] ], dayPlusOneTime);
    await userRegistry.updateUserExtended(1, KYC_LEVEL_KEY, 0);
    await userRegistry.updateUserExtended(2, KYC_LEVEL_KEY, 1);
    await userRegistry.updateUserExtended(3, KYC_LEVEL_KEY, 2);
    await userRegistry.updateUserExtended(4, KYC_LEVEL_KEY, 3);
    await userRegistry.updateUserExtended(5, KYC_LEVEL_KEY, 4);
    await userRegistry.updateUserExtended(6, KYC_LEVEL_KEY, 5);
    ratesProvider = await RatesProvider.new("Dummy");
    rateWEICHF = await ratesProvider.convertRate(2072333, CHF, 2);
  });

  beforeEach(async function () {
    token = await Token.new("Name", "Symbol", 0, accounts[1], 1000000);
    sale = await CTokensale.new(
      token.address,
      vaultERC20,
      vaultETH,
      tokenPrice,
      priceUnit,
      CHF,
      userRegistry.address,
      ratesProvider.address,
      start,
      end,
      bonuses,
      bonusUntil
    );
    await token.approve(sale.address, supply, { from: accounts[1] });
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

  it("should have a user registry", async function () {
    const saleUserRegistry = await sale.userRegistry();
    assert.equal(saleUserRegistry, userRegistry.address, "userRegistry");
  });

  it("should have a base currency", async function () {
    const baseCurrency = await sale.baseCurrency();
    assert.equal(baseCurrency, CHF.padEnd(66, "0"), "baseCurrency");
  });

  it("should have a rates provider", async function () {
    const saleRatesProvider = await sale.ratesProvider();
    assert.equal(saleRatesProvider, ratesProvider.address, "ratesProvider");
  });

  describe("during the sale", async function () {

    beforeEach(async function () {
      await ratesProvider.defineCurrencies([ CHF ], [ 2 ]);
      await ratesProvider.defineRates([ rateWEICHF ]);
      await sale.updateSchedule(0, end);
    });

    it("should have token investment", async function () {
      const tokens = await sale.tokenInvestment(accounts[3], 1000001);
      assert.equal(tokens.toString(), 2000, "tokenInvestment");
    });

    it("should add offchain investment", async function () {
      await sale.addOffchainInvestment(accounts[3], 10000001);

      const invested = await sale.investorInvested(accounts[3]);
      assert.equal(invested.toString(), 1500000, "invested");

      const unspentETH = await sale.investorUnspentETH(accounts[3]);
      assert.equal(unspentETH.toString(), 0, "unspentETH");

      const tokens = await sale.investorTokens(accounts[3]);
      assert.equal(tokens.toString(), 3300, "tokens");
    });

    it("should let investor invest", async function () {
      let weiInvestment = new BN(rateWEICHF).mul(new BN(tokenPrice)).mul(new BN(10)).add(new BN(1));
      await sale.investETH({ from: accounts[3], value: weiInvestment });

      const invested = await sale.investorInvested(accounts[3]);
      assert.equal(invested.toString(), 5000, "invested");

      const unspentETH = await sale.investorUnspentETH(accounts[3]);
      assert.equal(unspentETH.toString(), 1, "unspentETH");

      const tokens = await sale.investorTokens(accounts[3]);
      assert.equal(tokens.toString(), 11, "tokens");
    });

    describe("with already investments", async function () {
      beforeEach(async function () {
        await sale.addOffchainInvestment(accounts[2], 1500001);
        await sale.addOffchainInvestment(accounts[3], 1000300);
      });

      it("should have a total raised", async function () {
        const saleTotalRaised = await sale.totalRaised();
        assert.equal(saleTotalRaised.toString(), "1300000", "totalRaised");
      });

      it("should have a total unspent ETH", async function () {
        const saleTotalUnspentETH = await sale.totalUnspentETH();
        assert.equal(saleTotalUnspentETH.toString(), "0", "totalUnspentETH");
      });

      it("should have a total refunded ETH", async function () {
        const saleTotalRefundedETH = await sale.totalRefundedETH();
        assert.equal(saleTotalRefundedETH.toString(), "0", "totalRefundedETH");
      });

      it("should add offchain investment", async function () {
        const tx = await sale.addOffchainInvestment(accounts[3], 1000300);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs[0].event, "Investment", "event");
        assert.equal(tx.logs[0].args.investor, accounts[3], "investor");
        assert.equal(tx.logs[0].args.invested.toString(), 500000, "amount investment");
        assert.equal(tx.logs[0].args.tokens.toString(), 1100, "tokens");

        const invested = await sale.investorInvested(accounts[3]);
        assert.equal(invested.toString(), 1500000, "invested");

        const unspentETH = await sale.investorUnspentETH(accounts[3]);
        assert.equal(unspentETH.toString(), 0, "unspentETH");

        const tokens = await sale.investorTokens(accounts[3]);
        assert.equal(tokens.toString(), 3300, "tokens");
      });
    });
  });
});