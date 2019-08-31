"user strict";

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const SchedulableTokensale = artifacts.require("tokensale/SchedulableTokensale.sol");
const Token = artifacts.require("util/token/TokenERC20.sol");

contract("SchedulableTokensale", function (accounts) {
  let sale, token;
 
  const vaultERC20 = accounts[1];
  const vaultETH = accounts[2];
  const tokenPrice = 500;
  const supply = "1000000";
  const start = 4102444800;
  const end = 7258118400;
  const MAX_UINT256 = web3.utils.toBN("ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

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

  it("should have no schedule", async function () {
    const schedule = await sale.schedule();
    assert.deepEqual(schedule[0], MAX_UINT256, "schedule start");
    assert.deepEqual(schedule[1], MAX_UINT256, "schedule end");
  });

  it("should not be closed", async function () {
    const isClosed = await sale.isClosed();
    assert.ok(!isClosed, "isClosed");
  });

  it("should prevent non operator to update the schedule", async function () {
    await assertRevert(sale.updateSchedule(start, end, { from: accounts[2] }), "OP01");
  });

  it("should let operator to update the schedule", async function () {
    await sale.updateSchedule(start, end);

    const schedule = await sale.schedule();
    assert.equal(schedule[0], start, "schedule start");
    assert.equal(schedule[1], end, "schedule end");
  });

  describe("during the sale", async function () {
    beforeEach(async function () {
      sale.updateSchedule(0, end);
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
  });
});
