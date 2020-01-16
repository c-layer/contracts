"user strict";

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const UserTokensaleMock = artifacts.require("tokensale/UserTokensaleMock.sol");
const Token = artifacts.require("util/token/TokenERC20.sol");
const RatesProvider = artifacts.require("RatesProvider.sol");
const UserRegistry = artifacts.require("UserRegistry.sol");
const BN = require("bn.js");

contract("UserTokensale", function (accounts) {
  let sale, token, ratesProvider, userRegistry;

  const KYC_LEVEL_KEY = 0;
  const AML_LIMIT_KEY = 1;
  const vaultERC20 = accounts[1];
  const vaultETH = accounts[2];
  const tokenPrice = 500;
  const unitPrice = 1;
  const supply = "1000000";
  const dayPlusOneTime = Math.floor((new Date()).getTime() / 1000) + 3600 * 24;
  const rateWEICHF = new BN("20723");
  const rateUSDCHF = new BN("900000000000000000");
  const rateOffset = new BN(10).pow(new BN(18));
  const CHF = web3.utils.fromAscii("CHF");
  const USD = web3.utils.fromAscii("USD");
  const ETH = web3.utils.fromAscii("ETH");
  const contributionLimits = ["0", "300000", "1500000", "10000000", "100000000"];

  before(async function () {
    ratesProvider = await RatesProvider.new("Dummy");
    await ratesProvider.defineCurrencies([CHF, ETH, USD], [2, 18, 2], rateOffset);
    await ratesProvider.defineRates([rateWEICHF, rateUSDCHF]);
    userRegistry = await UserRegistry.new(
      "Dummy", CHF,
      [accounts[1], accounts[2], accounts[3], accounts[4], accounts[5], accounts[6]], dayPlusOneTime);
    await userRegistry.updateUserExtended(1, KYC_LEVEL_KEY, 0);
    await userRegistry.updateUserExtended(2, KYC_LEVEL_KEY, 1);
    await userRegistry.updateUserExtended(3, KYC_LEVEL_KEY, 2);
    await userRegistry.updateUserExtended(4, KYC_LEVEL_KEY, 3);
    await userRegistry.updateUserExtended(5, KYC_LEVEL_KEY, 4);
    await userRegistry.updateUserExtended(6, KYC_LEVEL_KEY, 5);
  });

  beforeEach(async function () {
    token = await Token.new("Name", "Symbol", 0, accounts[1], 1000000);
    sale = await UserTokensaleMock.new(
      token.address,
      vaultERC20,
      vaultETH,
      tokenPrice,
      unitPrice,
      USD,
      ratesProvider.address,
      userRegistry.address
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

  it("should have a investor count", async function () {
    const saleInvestorCount = await sale.investorCount();
    assert.equal(saleInvestorCount, 6, "investorCount");
  });

  it("should have investor 1 unspentETH to 0", async function () {
    const unspentETH = await sale.registeredInvestorUnspentETH(1);
    assert.equal(unspentETH.toString(), 0, "unspentETH");
  });

  it("should have investor 1 invested to 0", async function () {
    const invested = await sale.registeredInvestorInvested(1);
    assert.equal(invested.toString(), 0, "tokenPrice");
  });

  it("should have investor 1 tokens to 0", async function () {
    const tokens = await sale.registeredInvestorTokens(1);
    assert.equal(tokens.toString(), 0, "userRegistry");
  });

  it("should have investor 3 contribution limit", async function () {
    const tokens = await sale.contributionLimit(3);
    assert.equal(tokens.toString(), 0, "contribution");
  });

  it("should have investor 5 contribution limit", async function () {
    const tokens = await sale.contributionLimit(5);
    assert.equal(tokens.toString(), 0, "contribution");
  });

  it("should have investor 3 token investment", async function () {
    const wei = web3.utils.toWei("1", "microether");
    const tokens = await sale.tokenInvestment(accounts[3], wei);
    assert.equal(tokens.toString(), 0, "tokenInvestment");
  });

  it("should prevent non operator to define contribution limit", async function () {
    await assertRevert(sale.defineContributionLimits(contributionLimits, { from: accounts[1] }), "OP01");
  });

  it("should let operator define contribution limit", async function () {
    const tx = await sale.defineContributionLimits(contributionLimits);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs[0].event, "ContributionLimits", "event");
    assert.deepEqual(tx.logs[0].args.contributionLimits.map((x) => x.toString()),
      contributionLimits, "contributionLimits");
  });

  it("should revert 1 micro ETH", async function () {
    const wei = web3.utils.toWei("1", "microether");
    await assertRevert(sale.investETH({ value: wei, from: accounts[3] }), "CTS02");
  });

  it("should revert 1 ETH", async function () {
    const wei = web3.utils.toWei("1", "ether");
    await assertRevert(sale.investETH({ value: wei, from: accounts[3] }), "TOS07");
  });

  it("should revert 30'000 USD", async function () {
    await assertRevert(sale.addOffchainInvestment(accounts[3], "3000000"), "TOS07");
  });

  describe("and with contribution aml limit", function () {
    beforeEach(async function () {
      await sale.defineContributionLimits(contributionLimits);
    });

    it("should have investor 3 contribution limit", async function () {
      const tokens = await sale.contributionLimit(3);
      assert.equal(tokens.toString(), 1500000, "contribution");
    });

    it("should have investor 5 contribution limit", async function () {
      const tokens = await sale.contributionLimit(5);
      assert.equal(tokens.toString(), 100000000, "contribution");
    });

    it("should have investor 3 token investment", async function () {
      const wei = web3.utils.toWei("1", "microether");
      const tokens = await sale.tokenInvestment(accounts[3], wei);
      assert.equal(tokens.toString(), 3000, "tokenInvestment");
    });

    it("should invest 70 ETH", async function () {
      const wei = web3.utils.toWei("70", "ether");
      const tx = await sale.investETH({ value: wei, from: accounts[3] });
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs[0].event, "Investment", "event");
      assert.equal(tx.logs[0].args.investor, accounts[3], "investor");
      assert.equal(tx.logs[0].args.invested.toString(), 1500000, "amount investment");
      assert.equal(tx.logs[0].args.tokens.toString(), 3000, "tokens");
      assert.equal(tx.logs[1].event, "WithdrawETH", "event");
      assert.equal(tx.logs[1].args.amount.toString(), "65145007962167639820", "amount withdraw");
    });

    it("should revert 30'000 USD", async function () {
      await assertRevert(sale.addOffchainInvestment(accounts[3], "3000000"), "TOS08");
    });

    it("should invest 2'700 USD", async function () {
      const tx = await sale.addOffchainInvestment(accounts[3], "270000");
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1, "events count");
      assert.equal(tx.logs[0].event, "Investment", "event");
      assert.equal(tx.logs[0].args.investor, accounts[3], "investor");
      assert.equal(tx.logs[0].args.invested.toString(), 270000, "amount investment");
      assert.equal(tx.logs[0].args.tokens.toString(), 540, "tokens");
    });
  });

  describe("and with user registry aml limits", function () {
    beforeEach(async function () {
      await userRegistry.updateUserExtended(1, AML_LIMIT_KEY, "100000");
      await userRegistry.updateUserExtended(2, AML_LIMIT_KEY, "200000");
      await userRegistry.updateUserExtended(3, AML_LIMIT_KEY, "300000");
      await userRegistry.updateUserExtended(4, AML_LIMIT_KEY, "400000");
      await userRegistry.updateUserExtended(5, AML_LIMIT_KEY, "500000");
      await userRegistry.updateUserExtended(6, AML_LIMIT_KEY, "600000");
    });

    it("should have investor 1 contribution limit", async function () {
      const tokens = await sale.contributionLimit(1);
      assert.equal(tokens.toString(), "111111", "contribution");
    });

    it("should have investor 3 contribution limit", async function () {
      const tokens = await sale.contributionLimit(3);
      assert.equal(tokens.toString(), "333333", "contribution");
    });

    it("should have investor 5 contribution limit", async function () {
      const tokens = await sale.contributionLimit(5);
      assert.equal(tokens.toString(), "555555", "contribution");
    });

    it("should have investor 3 token investment", async function () {
      const wei = web3.utils.toWei("1", "microether");
      const tokens = await sale.tokenInvestment(accounts[3], wei);
      assert.equal(tokens.toString(), "666", "tokenInvestment");
    });

    it("should invest 70 ETH", async function () {
      const wei = web3.utils.toWei("70", "ether");
      const tx = await sale.investETH({ value: wei, from: accounts[3] });
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs[0].event, "Investment", "event");
      assert.equal(tx.logs[0].args.investor, accounts[3], "investor");
      assert.equal(tx.logs[0].args.invested.toString(), "333000", "amount investment");
      assert.equal(tx.logs[0].args.tokens.toString(), "666", "tokens");
      assert.equal(tx.logs[1].event, "WithdrawETH", "event");
      assert.equal(tx.logs[1].args.amount.toString(), "14462191767601216040", "amount withdraw");
    });

    it("should invest 2'700 USD", async function () {
      const tx = await sale.addOffchainInvestment(accounts[3], "270000");
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1, "events count");
      assert.equal(tx.logs[0].event, "Investment", "event");
      assert.equal(tx.logs[0].args.investor, accounts[3], "investor");
      assert.equal(tx.logs[0].args.invested.toString(), 270000, "amount investment");
      assert.equal(tx.logs[0].args.tokens.toString(), 540, "tokens");
    });
  });

  describe("and with both contribution and user registry aml limits", function () {
    beforeEach(async function () {
      await sale.defineContributionLimits(contributionLimits);
      await userRegistry.updateUserExtended(1, AML_LIMIT_KEY, "100000");
      await userRegistry.updateUserExtended(2, AML_LIMIT_KEY, "200000");
      await userRegistry.updateUserExtended(3, AML_LIMIT_KEY, "300000");
      await userRegistry.updateUserExtended(4, AML_LIMIT_KEY, "400000");
      await userRegistry.updateUserExtended(5, AML_LIMIT_KEY, "500000");
      await userRegistry.updateUserExtended(6, AML_LIMIT_KEY, "600000");
    });

    it("should have investor 1 contribution limit", async function () {
      const tokens = await sale.contributionLimit(1);
      assert.equal(tokens.toString(), "111111", "contribution");
    });

    it("should have investor 3 contribution limit", async function () {
      const tokens = await sale.contributionLimit(3);
      assert.equal(tokens.toString(), "333333", "contribution");
    });

    it("should have investor 5 contribution limit", async function () {
      const tokens = await sale.contributionLimit(5);
      assert.equal(tokens.toString(), "555555", "contribution");
    });

    it("should have investor 3 token investment", async function () {
      const wei = web3.utils.toWei("1", "ether");
      const tokens = await sale.tokenInvestment(accounts[3], wei);
      assert.equal(tokens.toString(), "666", "tokenInvestment");
    });

    it("should invest 70 ETH", async function () {
      const wei = web3.utils.toWei("70", "ether");
      const tx = await sale.investETH({ value: wei, from: accounts[3] });
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs[0].event, "Investment", "event");
      assert.equal(tx.logs[0].args.investor, accounts[3], "investor");
      assert.equal(tx.logs[0].args.invested.toString(), "333000", "amount investment");
      assert.equal(tx.logs[0].args.tokens.toString(), "666", "tokens");
      assert.equal(tx.logs[1].event, "WithdrawETH", "event");
      assert.equal(tx.logs[1].args.amount.toString(), "14462191767601216040", "amount withdraw");
    });

    it("should invest 2'700 USD", async function () {
      const tx = await sale.addOffchainInvestment(accounts[3], "270000");
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1, "events count");
      assert.equal(tx.logs[0].event, "Investment", "event");
      assert.equal(tx.logs[0].args.investor, accounts[3], "investor");
      assert.equal(tx.logs[0].args.invested.toString(), "270000", "amount investment");
      assert.equal(tx.logs[0].args.tokens.toString(), "540", "tokens");
    });
  });
});
