"user strict";

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const SchedulableTokensale = artifacts.require("tokensale/SchedulableTokensale.sol");
const Token = artifacts.require("util/token/TokenERC20.sol");
const BN = require("bn.js");

contract("SchedulableTokensale", function (accounts) {
  let sale, token;
 
  const vaultERC20 = accounts[1];
  const vaultETH = accounts[2];
  const tokenPrice = 500;
  const supply = "1000000";
  const dayPlusOneTime = Math.floor((new Date()).getTime() / 1000) + 3600 * 24;

  const start = 4102444800;
  const end = 7258118400;

  beforeEach(async function () {
    token = await Token.new("Name", "Symbol", 0, accounts[1], 1000000);
    sale = await SchedulableTokensale.new(
      token.address,
      vaultERC20,
      vaultETH,
      tokenPrice,
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
});
