"user strict";

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const KYCTokensale = artifacts.require("tokensale/KYCTokensale.sol");
const Token = artifacts.require("util/token/TokenERC20.sol");
const UserRegistry = artifacts.require("UserRegistry.sol");
const BN = require("bn.js");

contract("KYCTokensale", function (accounts) {
  let sale, token, userRegistry;
 
  const KYC_LEVEL_KEY = 1;

  const vaultERC20 = accounts[1];
  const vaultETH = accounts[2];
  const tokenPrice = 500;
  const supply = "1000000";
  const dayPlusOneTime = Math.floor((new Date()).getTime() / 1000) + 3600 * 24;

  before(async function () {
    userRegistry = await UserRegistry.new(
      "Dummy",
      [ accounts[1], accounts[2], accounts[3], accounts[4], accounts[5], accounts[6] ], dayPlusOneTime);
    await userRegistry.updateUserExtended(1, KYC_LEVEL_KEY, 0);
    await userRegistry.updateUserExtended(2, KYC_LEVEL_KEY, 1);
    await userRegistry.updateUserExtended(3, KYC_LEVEL_KEY, 2);
    await userRegistry.updateUserExtended(4, KYC_LEVEL_KEY, 3);
    await userRegistry.updateUserExtended(5, KYC_LEVEL_KEY, 4);
    await userRegistry.updateUserExtended(6, KYC_LEVEL_KEY, 5);
  });

  beforeEach(async function () {
    token = await Token.new("Name", "Symbol", 0, accounts[1], 1000000);
    sale = await KYCTokensale.new(
      token.address,
      vaultERC20,
      vaultETH,
      tokenPrice,
      userRegistry.address,
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

  it("should have investor 1 unspentETH to 0", async function () {
    const unspentETH = await sale.registredInvestorUnspentETH(1);
    assert.equal(unspentETH.toString(), 0, "unspentETH");
  });

  it("should have investor 1 invested to 0", async function () {
    const invested = await sale.registredInvestorInvested(1);
    assert.equal(invested.toString(), 0, "tokenPrice");
  });

  it("should have investor 1 tokens to 0", async function () {
    const tokens = await sale.registredInvestorTokens(1);
    assert.equal(tokens.toString(), 0, "userRegistry");
  });

  it("should have investor 1 contribution limit", async function () {
    const tokens = await sale.contributionLimit(3);
    assert.equal(tokens.toString(), 1500000, "contribution");
  });

  it("should have investor 1 token investment", async function () {
    const wei = web3.utils.toWei("1", "microether");
    const tokens = await sale.tokenInvestment(accounts[3], wei);
    assert.equal(tokens.toString(), 3000, "tokenInvestment");
  });

  it("should invest 1 micro ETH", async function () {
    const wei = web3.utils.toWei("1", "microether");
    const tx = await sale.investETH({ value: wei, from: accounts[3] });
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs[0].event, "Investment", "event");
    assert.equal(tx.logs[0].args.investor, accounts[3], "investor");
    assert.equal(tx.logs[0].args.amount.toString(), 1500000, "amount investment");
    assert.equal(tx.logs[1].event, "WithdrawETH", "event");
    assert.equal(tx.logs[1].args.amount.toString(), 1500000, "amount withdraw");
  });
});
