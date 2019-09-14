"user strict";

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const Tokensale = artifacts.require("tokensale/BaseTokensale.sol");
const Token = artifacts.require("util/token/TokenERC20.sol");
const BN = require("bn.js");

contract("BaseTokensale", function (accounts) {
  let sale, token;

  const vaultERC20 = accounts[1];
  const vaultETH = accounts[2];
  const tokenPrice = web3.utils.toWei("1", "microether");
  const supply = "1000000";

  beforeEach(async function () {
    token = await Token.new("Name", "Symbol", 0, accounts[1], 1000000);
    sale = await Tokensale.new(
      token.address,
      vaultERC20,
      vaultETH,
      tokenPrice);
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

  it("should have a total raised", async function () {
    const saleTotalRaised = await sale.totalRaised();
    assert.equal(saleTotalRaised.toString(), "0", "totalRaised");
  });

  it("should have a total tokens sold", async function () {
    const saleTotalTokensSold = await sale.totalTokensSold();
    assert.equal(saleTotalTokensSold.toString(), "0", "totalTokensSold");
  });

  it("should have a total unspent ETH", async function () {
    const saleTotalUnspentETH = await sale.totalUnspentETH();
    assert.equal(saleTotalUnspentETH.toString(), "0", "totalUnspentETH");
  });

  it("should have a total refunded ETH", async function () {
    const saleTotalRefundedETH = await sale.totalRefundedETH();
    assert.equal(saleTotalRefundedETH.toString(), "0", "totalRefundedETH");
  });

  it("should have an available supply", async function () {
    const saleAvailableSupply = await sale.availableSupply();
    assert.equal(saleAvailableSupply.toString(), supply, "availableSupply");
  });

  it("should have an investor unspent ETH", async function () {
    const saleInvestorUnspentETH = await sale.investorUnspentETH(accounts[3]);
    assert.equal(saleInvestorUnspentETH.toString(), "0", "saleInvestorUnspentETH");
  });

  it("should have an investor invested", async function () {
    const saleInvestorInvested = await sale.investorInvested(accounts[3]);
    assert.equal(saleInvestorInvested.toString(), "0", "saleInvestorInvested");
  });

  it("should have an investor tokens", async function () {
    const saleInvestorTokens = await sale.investorTokens(accounts[3]);
    assert.equal(saleInvestorTokens.toString(), "0", "saleInvestorTokens");
  });

  it("should have token investment for 0 ETH", async function () {
    const saleTokenInvestment = await sale.tokenInvestment(accounts[3], "0");
    assert.equal(saleTokenInvestment.toString(), "0", "saleTokenInvestment 0 ETH");
  });

  it("should have token investment for 1 micro ETH", async function () {
    const saleTokenInvestment = await sale.tokenInvestment(accounts[3], web3.utils.toWei("1", "microether"));
    assert.equal(saleTokenInvestment.toString(), "1", "saleTokenInvestment 1 micro ETH");
  });

  it("should have token investment for 1 ETH", async function () {
    const saleTokenInvestment = await sale.tokenInvestment(accounts[3], web3.utils.toWei("1", "ether"));
    assert.equal(saleTokenInvestment.toString(), "1000000", "saleTokenInvestment 1 ETH");
  });

  it("should have token investment for 2 ETH", async function () {
    const saleTokenInvestment = await sale.tokenInvestment(accounts[3], web3.utils.toWei("2", "ether"));
    assert.equal(saleTokenInvestment.toString(), "1000000", "saleTokenInvestment 2 ETH");
  });

  it("should fund the sale with ETH", async function () {
    const tx = await sale.fundETH({ value: web3.utils.toWei("0.01", "ether") });
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs[0].event, "FundETH", "event");
    assert.equal(tx.logs[0].args.amount, web3.utils.toWei("0.01", "ether"), "amount");
  });

  it("should reject refund unspent ETH", async function () {
    await assertRevert(sale.refundUnspentETH({ form: accounts[3] }), "TOS03");
  });

  it("should reject refund many unspent ETH", async function () {
    await assertRevert(sale.refundManyUnspentETH([ accounts[3] ]), "TOS03");
  });

  it("should reject refund many unspent ETH", async function () {
    await assertRevert(sale.refundManyUnspentETH([ accounts[3] ]), "TOS03");
  });

  it("should withdraw all ETH funds", async function () {
    const tx = await sale.withdrawAllETHFunds();
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs[0].event, "WithdrawETH", "event");
    assert.equal(tx.logs[0].args.amount, "0", "amount");
  });

  it("should reject value transfer if data is send along", async function () {
    const wei = web3.utils.toWei("1", "ether");
    await assertRevert(web3.eth.sendTransaction({
      from: accounts[0],
      to: sale.address,
      value: wei,
      data: "0x1",
    }), "TOS01");
  });

  it("should reject value transfer if no ETH is send along", async function () {
    await assertRevert(web3.eth.sendTransaction({
      from: accounts[0],
      to: sale.address,
      value: "0",
    }), "TOS04");
  });

  it("should transfer 1 micro ETH to the sale", async function () {
    const wei = web3.utils.toWei("1", "microether");
    const tx = await web3.eth.sendTransaction({
      from: accounts[3],
      to: sale.address,
      value: wei,
      gas: 250000,
    });
    assert.ok(tx.status, "Status");
  });

  it("should have correct gas estimate for investing  1 micro ETH", async function () {
    const wei = web3.utils.toWei("1", "microether");
    const gas = await sale.investETH.estimateGas({ value: wei, from: accounts[3] });
    assert.equal(gas, "170431", "gas estimate");
  });

  it("should invest 1 micro ETH", async function () {
    const wei = web3.utils.toWei("1", "microether");
    const tx = await sale.investETH({ value: wei, from: accounts[3] });
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs[0].event, "Investment", "event");
    assert.equal(tx.logs[0].args.investor, accounts[3], "investor");
    assert.equal(tx.logs[0].args.invested, wei, "amount investment");
    assert.equal(tx.logs[0].args.tokens, 1, "tokens");
    assert.equal(tx.logs[1].event, "WithdrawETH", "event");
    assert.equal(tx.logs[1].args.amount, wei, "amount withdraw");
  });

  it("should invest 1 ETH", async function () {
    const wei = web3.utils.toWei("1", "ether");
    const tx = await sale.investETH({ value: wei, from: accounts[3] });
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs[0].event, "Investment", "event");
    assert.equal(tx.logs[0].args.investor, accounts[3], "investor");
    assert.equal(tx.logs[0].args.invested.toString(), wei, "amount investment");
    assert.equal(tx.logs[0].args.tokens.toString(), 1000000, "tokens");
    assert.equal(tx.logs[1].event, "WithdrawETH", "event");
    assert.equal(tx.logs[1].args.amount, wei, "amount withdraw");
  });

  it("should invest 2 ETH", async function () {
    const wei = web3.utils.toWei("2", "ether");
    const maxWei = web3.utils.toWei("1", "ether");
    const tx = await sale.investETH({ value: wei, from: accounts[3] });
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs[0].event, "Investment", "event");
    assert.equal(tx.logs[0].args.investor, accounts[3], "investor");
    assert.equal(tx.logs[0].args.invested.toString(), maxWei, "amount investment");
    assert.equal(tx.logs[0].args.tokens.toString(), 1000000, "tokens");
    assert.equal(tx.logs[1].event, "WithdrawETH", "event");
    assert.equal(tx.logs[1].args.amount.toString(), maxWei, "amount withdraw");
  });

  describe("after some investor investments and an ETH refund", async function () {
    let balanceVaultETHBefore, balanceBeforeRefund, refundCost;

    beforeEach(async function () {
      balanceVaultETHBefore = await web3.eth.getBalance(vaultETH);
      const wei1 = web3.utils.toWei("1.5", "microether");
      const wei2 = web3.utils.toWei("2", "microether");
      const wei3 = web3.utils.toWei("2.1", "microether");
      const wei4 = web3.utils.toWei("1.9", "microether");

      const tx1 = await sale.investETH({ value: wei1, from: accounts[3] });
      assert.ok(tx1.receipt.status, "Status");
      const tx2 = await sale.investETH({ value: wei2, from: accounts[4] });
      assert.ok(tx2.receipt.status, "Status");
      const tx3 = await sale.investETH({ value: wei3, from: accounts[4] });
      assert.ok(tx3.receipt.status, "Status");
      const tx4 = await sale.investETH({ value: wei4, from: accounts[5] });
      assert.ok(tx4.receipt.status, "Status");
      const tx5 = await sale.investETH({ value: wei4, from: accounts[5] });
      assert.ok(tx5.receipt.status, "Status");

      balanceBeforeRefund = await web3.eth.getBalance(accounts[4]);

      // gas price is 1 WEI
      refundCost = await sale.refundUnspentETH.estimateGas({ from: accounts[4] });
      const tx6 = await sale.refundUnspentETH({ from: accounts[4] });
      assert.ok(tx6.receipt.status, "Status");
    });

    it("should have ERC20 transfered", async function () {
      const balanceVaultERC20 = await token.balanceOf(vaultERC20);
      assert.equal(balanceVaultERC20.toString(), "999992", "balanceVaultERC20");
    });

    it("should have ETH in tokensale", async function () {
      const balanceSaleETH = await web3.eth.getBalance(sale.address);
      assert.equal(balanceSaleETH.toString(), web3.utils.toWei("1.3", "microether"), "balanceSaleETH");
    });

    it("should have a vault ETH", async function () {
      let balanceVaultETHAfter = await web3.eth.getBalance(vaultETH);
      const balanceDiff = new BN(balanceVaultETHAfter).sub(new BN(balanceVaultETHBefore));
      assert.equal(balanceDiff.toString(), web3.utils.toWei("8", "microether"), "balanceVaultETH");
    });

    it("should have a refund cost", async function () {
      assert.equal(refundCost.toString(), "62435", "refund gas estimate");
    });

    it("should have account refunded", async function () {
      let balanceAfterRefund = await web3.eth.getBalance(accounts[4]);

      const memorySpaceFreed = new BN(15722);
      const realCost = new BN(refundCost).sub(memorySpaceFreed);

      const balanceDiff = new BN(balanceAfterRefund).add(new BN(realCost)).sub(new BN(balanceBeforeRefund));
      assert.equal(balanceDiff.toString(), web3.utils.toWei("0.1", "microether"), "balance refunded");
    });

    it("should have a total raised", async function () {
      const saleTotalRaised = await sale.totalRaised();
      assert.equal(saleTotalRaised.toString(), web3.utils.toWei("8", "microether"), "totalRaised");
    });

    it("should have a total unspent ETH", async function () {
      const saleTotalUnspentETH = await sale.totalUnspentETH();
      assert.equal(saleTotalUnspentETH.toString(), web3.utils.toWei("1.3", "microether"), "totalUnspentETH");
    });

    it("should have a total refunded ETH", async function () {
      const saleTotalRefundedETH = await sale.totalRefundedETH();
      assert.equal(saleTotalRefundedETH.toString(), web3.utils.toWei("0.1", "microether"), "totalRefundedETH");
    });

    it("should have an available supply", async function () {
      const saleAvailableSupply = await sale.availableSupply();
      assert.equal(saleAvailableSupply.toString(), "999992", "availableSupply");
    });

    it("should have unspent ETH for investors", async function () {
      const unspentETHAccount3 = await sale.investorUnspentETH(accounts[3]);
      const unspentETHAccount4 = await sale.investorUnspentETH(accounts[4]);
      const unspentETHAccount5 = await sale.investorUnspentETH(accounts[5]);
      assert.deepEqual([
        unspentETHAccount3.toString(),
        unspentETHAccount4.toString(),
        unspentETHAccount5.toString(),
      ], [ web3.utils.toWei("0.5", "microether"), "0", web3.utils.toWei("0.8", "microether") ],
      "saleInvestorUnspentETH");
    });

    it("should have an investor invested", async function () {
      const investedAccount3 = await sale.investorInvested(accounts[3]);
      const investedAccount4 = await sale.investorInvested(accounts[4]);
      const investedAccount5 = await sale.investorInvested(accounts[5]);
      assert.deepEqual([
        investedAccount3.toString(),
        investedAccount4.toString(),
        investedAccount5.toString(),
      ], [
        web3.utils.toWei("1", "microether"),
        web3.utils.toWei("4", "microether"),
        web3.utils.toWei("3", "microether"),
      ],
      "saleInvestorInvested");
    });

    it("should have an investor tokens", async function () {
      const tokensAccount3 = await sale.investorTokens(accounts[3]);
      const tokensAccount4 = await sale.investorTokens(accounts[4]);
      const tokensAccount5 = await sale.investorTokens(accounts[5]);
      assert.deepEqual([
        tokensAccount3.toString(),
        tokensAccount4.toString(),
        tokensAccount5.toString(),
      ], [ "1", "4", "3" ],
      "saleInvestorTokens");
    });
  });

  describe("after all tokens sold", async function () {
    let balanceVaultETHBefore;

    beforeEach(async function () {
      balanceVaultETHBefore = await web3.eth.getBalance(vaultETH);

      const wei1 = web3.utils.toWei("0.9", "ether");
      const wei2 = web3.utils.toWei("0.2", "ether");

      const tx1 = await sale.investETH({ value: wei1, from: accounts[3] });
      assert.ok(tx1.receipt.status, "Status");
      const tx2 = await sale.investETH({ value: wei2, from: accounts[4] });
      assert.ok(tx2.receipt.status, "Status");
    });

    it("should have ERC20 transfered", async function () {
      const balanceVaultERC20 = await token.balanceOf(vaultERC20);
      assert.equal(balanceVaultERC20, "0", "balanceVaultERC20");
    });

    it("should have ETH in tokensale", async function () {
      const balanceSaleETH = await web3.eth.getBalance(sale.address);
      assert.equal(balanceSaleETH, web3.utils.toWei("0.1", "ether"), "balanceSaleETH");
    });

    it("should have a vault ETH", async function () {
      let balanceVaultETHAfter = await web3.eth.getBalance(vaultETH);
      const balanceDiff = new BN(balanceVaultETHAfter).sub(new BN(balanceVaultETHBefore));
      assert.equal(balanceDiff.toString(), web3.utils.toWei("1", "ether"), "balanceVaultETH");
    });

    it("should have a total raised", async function () {
      const saleTotalRaised = await sale.totalRaised();
      assert.equal(saleTotalRaised.toString(), web3.utils.toWei("1", "ether"), "totalRaised");
    });

    it("should have a total tokens sold", async function () {
      const saleTotalTokensSold = await sale.totalTokensSold();
      assert.equal(saleTotalTokensSold.toString(), supply, "totalTokensSold");
    });

    it("should have a total unspent ETH", async function () {
      const saleTotalUnspentETH = await sale.totalUnspentETH();
      assert.equal(saleTotalUnspentETH.toString(), web3.utils.toWei("0.1", "ether"), "totalUnspentETH");
    });

    it("should have a total refunded ETH", async function () {
      const saleTotalRefundedETH = await sale.totalRefundedETH();
      assert.equal(saleTotalRefundedETH.toString(), "0", "totalRefundedETH");
    });

    it("should have an available supply", async function () {
      const saleAvailableSupply = await sale.availableSupply();
      assert.equal(saleAvailableSupply.toString(), "0", "availableSupply");
    });

    it("should refund account4", async function () {
      const tx = await sale.refundUnspentETH({ from: accounts[4] });
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs[0].event, "RefundETH", "event");
      assert.equal(tx.logs[0].args.recipient, accounts[4], "amount");
      assert.equal(tx.logs[0].args.amount.toString(), web3.utils.toWei("0.1", "ether"), "amount");
    });

    it("should refund unspent ETH many", async function () {
      const tx = await sale.refundManyUnspentETH([ accounts[4] ]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs[0].event, "RefundETH", "event");
      assert.equal(tx.logs[0].args.recipient, accounts[4], "amount");
      assert.equal(tx.logs[0].args.amount.toString(), web3.utils.toWei("0.1", "ether"), "amount");
    });
  });
});
