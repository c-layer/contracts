"user strict";

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const ChangeTokensale = artifacts.require("tokensale/ChangeTokensale.sol");
const Token = artifacts.require("util/token/TokenERC20.sol");
const RatesProvider = artifacts.require("RatesProvider.sol");
const BN = require("bn.js");

contract("ChangeTokensale", function (accounts) {
  let sale, token, ratesProvider;
  let rateWEICHF;
 
  const investmentWEI = web3.utils.toWei("1.001", "ether");
  const rateOffset = new BN(10).pow(new BN(18));
  const CHF = web3.utils.fromAscii("CHF");
  const ETH = web3.utils.fromAscii("ETH");
 
  const vaultERC20 = accounts[1];
  const vaultETH = accounts[2];
  const tokenPrice = 500;
  const priceUnit = 1;
  const supply = "1000000";

  before(async function () {
    ratesProvider = await RatesProvider.new("Dummy");
    rateWEICHF = new BN("20723");
    await ratesProvider.defineCurrencies([ CHF, ETH ], [ 2, 18 ], rateOffset);
  });

  describe("with a sale priced in CHF", async function () {
    beforeEach(async function () {
      token = await Token.new("Name", "Symbol", 0, accounts[1], 1000000);
      await ratesProvider.defineRates([ 0 ]);
      sale = await ChangeTokensale.new(
        token.address,
        vaultERC20,
        vaultETH,
        tokenPrice,
        priceUnit,
        CHF,
        ratesProvider.address,
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

    it("should have a base currency", async function () {
      const baseCurrency = await sale.baseCurrency();
      assert.equal(baseCurrency, CHF.padEnd(66, "0"), "baseCurrency");
    });

    it("should have a rates provider", async function () {
      const saleRatesProvider = await sale.ratesProvider();
      assert.equal(saleRatesProvider, ratesProvider.address, "ratesProvider");
    });

    it("should have a total raised ETH", async function () {
      const saleTotalRaisedETH = await sale.totalRaisedETH();
      assert.equal(saleTotalRaisedETH.toString(), 0, "totalRaisedETH");
    });

    it("should not let investor invest 0 ETH", async function () {
      await assertRevert(sale.investETH({ from: accounts[3], value: 0 }), "CTS01");
    });

    it("should not let investor invest in ETH when no ETHCHF rates exist", async function () {
      await assertRevert(sale.investETH({ from: accounts[3], value: investmentWEI }), "CTS02");
    });

    it("should prevent non operator to add offchain investment", async function () {
      await assertRevert(sale.addOffchainInvestment(accounts[3], 0, { from: accounts[3] }), "OP01");
    });

    it("should prevent operator to add 0 offchain investment", async function () {
      await assertRevert(sale.addOffchainInvestment(accounts[3], 0), "TOS04");
    });

    it("should let operator add 100CHF offchain investment", async function () {
      await sale.addOffchainInvestment(accounts[3], 10000);
      const unspentETH = await sale.investorUnspentETH(accounts[3]);
      assert.equal(unspentETH, 0, "unspent");

      const invested = await sale.investorInvested(accounts[3]);
      assert.equal(invested, 10000, "invested");

      const tokens = await sale.investorTokens(accounts[3]);
      assert.equal(tokens, 20, "tokens");
    });

    it("should let operator add 1'000'000CHF offchain investment", async function () {
      await sale.addOffchainInvestment(accounts[3], 100000000);
      const unspentETH = await sale.investorUnspentETH(accounts[3]);
      assert.equal(unspentETH, 0, "unspent");

      const invested = await sale.investorInvested(accounts[3]);
      assert.equal(invested, 100000000, "invested");

      const tokens = await sale.investorTokens(accounts[3]);
      assert.equal(tokens, 200000, "tokens");
    });

    it("should prevent operator to addOffchainInvestment larger than the supply", async function () {
      await assertRevert(sale.addOffchainInvestment(accounts[3], 10000000));
    });

    describe("when an ETHCHF rate is defined", async function () {
      beforeEach(async function () {
        await ratesProvider.defineRates([ rateWEICHF ]);
      });

      it("should let investor to invest in ETH", async function () {
        const vaultETHBefore = await web3.eth.getBalance(vaultETH);
        const saleBefore = await web3.eth.getBalance(sale.address);
        await sale.investETH({ from: accounts[3], value: investmentWEI });
        
        const balanceVaultETH = new BN(await web3.eth.getBalance(vaultETH)).sub(new BN(vaultETHBefore));
        const balanceSale = new BN(await web3.eth.getBalance(sale.address)).sub(new BN(saleBefore));
        const unspentETH = await sale.investorUnspentETH(accounts[3]);
        const invested = await sale.investorInvested(accounts[3]);
        const investedETH = new BN(invested).mul(rateOffset).div(new BN(rateWEICHF));
        const tokens = await sale.investorTokens(accounts[3]);
        const totalUnspentETH = await sale.totalUnspentETH();
        const expectedTokens = new BN(investmentWEI).mul(new BN(rateWEICHF)).div(new BN(tokenPrice)).div(rateOffset);
        const expectedTokenCostCHF = new BN(expectedTokens).mul(new BN(tokenPrice));
        const expectedTokenCostETH = new BN(expectedTokenCostCHF).mul(rateOffset).div(new BN(rateWEICHF));
        const expectedUnspentETH = new BN(investmentWEI).sub(new BN(expectedTokenCostETH));

        assert.equal(balanceVaultETH.toString(), investedETH.toString(), "Vault ETH must receive the investment");
        assert.equal(balanceSale.toString(), unspentETH.toString(), "Sale must hold the ETH unspent");
        assert.equal(totalUnspentETH.toString(), unspentETH.toString(), "total unspent");
        assert.equal(tokens.toString(), expectedTokens.toString(), "tokens");
        assert.equal(invested.toString(), expectedTokenCostCHF.toString(), "invested");
        assert.equal(unspentETH.toString(), expectedUnspentETH.toString(), "unspent");
      });

      describe("when other investors have already invested", async function () {
        let vaultETHBefore, saleBefore;
        const twice = new BN(2);
         
        beforeEach(async function () {
          vaultETHBefore = await web3.eth.getBalance(vaultETH);
          saleBefore = await web3.eth.getBalance(sale.address);
          await sale.investETH({ from: accounts[4], value: investmentWEI });
        });

        it("should have a total raised ETH", async function () {
          const saleTotalRaisedETH = await sale.totalRaisedETH();
          assert.equal(saleTotalRaisedETH.toString(), "989239009795878975", "totalRaisedETH");
        });

        it("should let same investor invest again", async function () {
          await sale.investETH({ from: accounts[4], value: investmentWEI });
        
          const balanceVaultETH = new BN(await web3.eth.getBalance(vaultETH)).sub(new BN(vaultETHBefore));
          const balanceSale = new BN(await web3.eth.getBalance(sale.address)).sub(new BN(saleBefore));
          const unspentETH = await sale.investorUnspentETH(accounts[4]);
          const invested = await sale.investorInvested(accounts[4]);
          const investedETH = new BN(invested).mul(rateOffset).div(new BN(rateWEICHF));
          const tokens = await sale.investorTokens(accounts[4]);
          const totalUnspentETH = await sale.totalUnspentETH();
          const expectedTokens = new BN(investmentWEI).mul(new BN(rateWEICHF)).div(new BN(tokenPrice)).div(rateOffset);
          const expectedTokenCostCHF = new BN(expectedTokens).mul(new BN(tokenPrice));
          const expectedTokenCostETH = new BN(expectedTokenCostCHF).mul(rateOffset).div(new BN(rateWEICHF));
          const expectedUnspentETH = new BN(investmentWEI).sub(new BN(expectedTokenCostETH));

          assert.equal(balanceVaultETH.toString(), investedETH.toString(), "Vault ETH must receive the investment");
          assert.equal(balanceSale.toString(), unspentETH.toString(), "Sale must hold the ETH unspent");
          assert.equal(totalUnspentETH.toString(), unspentETH.toString(), "total unspent");
          assert.equal(tokens.toString(), expectedTokens.mul(twice).toString(), "tokens");
          assert.equal(invested.toString(), expectedTokenCostCHF.mul(twice).toString(), "invested");
          assert.equal(unspentETH.toString(), expectedUnspentETH.mul(twice).toString(), "unspent");
        });

        it("should let another investor invest", async function () {
          await sale.investETH({ from: accounts[3], value: investmentWEI });
        
          const balanceVaultETH = new BN(await web3.eth.getBalance(vaultETH)).sub(new BN(vaultETHBefore));
          const balanceSale = new BN(await web3.eth.getBalance(sale.address)).sub(new BN(saleBefore));
          const unspentETH = await sale.investorUnspentETH(accounts[3]);
          const invested = await sale.investorInvested(accounts[3]);
          const investedETH = new BN(invested).mul(rateOffset).div(new BN(rateWEICHF));
          const tokens = await sale.investorTokens(accounts[3]);
          const totalUnspentETH = await sale.totalUnspentETH();
          const expectedTokens = new BN(investmentWEI).mul(new BN(rateWEICHF)).div(new BN(tokenPrice)).div(rateOffset);
          const expectedTokenCostCHF = new BN(expectedTokens).mul(new BN(tokenPrice));
          const expectedTokenCostETH = new BN(expectedTokenCostCHF).mul(rateOffset).div(new BN(rateWEICHF));
          const expectedUnspentETH = new BN(investmentWEI).sub(new BN(expectedTokenCostETH));

          assert.equal(
            balanceVaultETH.toString(),
            investedETH.mul(twice).toString(), "Vault ETH must receive the investment");
          assert.equal(balanceSale.toString(), unspentETH.mul(twice).toString(), "Sale must hold the ETH unspent");
          assert.equal(totalUnspentETH.toString(), unspentETH.mul(twice).toString(), "total unspent");
          assert.equal(tokens.toString(), expectedTokens.toString(), "tokens");
          assert.equal(invested.toString(), expectedTokenCostCHF.toString(), "invested");
          assert.equal(unspentETH.toString(), expectedUnspentETH.toString(), "unspent");
        });
      });
    });
  });

  describe("with a sale priced in ETH", async function () {
    beforeEach(async function () {
      token = await Token.new("Name", "Symbol", 0, accounts[1], 1000000);
      sale = await ChangeTokensale.new(
        token.address,
        vaultERC20,
        vaultETH,
        tokenPrice,
        priceUnit,
        ETH,
        ratesProvider.address,
      );
      await token.approve(sale.address, supply, { from: accounts[1] });
    });

    it("should have a base currency", async function () {
      const baseCurrency = await sale.baseCurrency();
      assert.equal(baseCurrency, ETH.padEnd(66, "0"), "baseCurrency");
    });

    it("should let investor to invest in ETH", async function () {
      await sale.investETH({ from: accounts[3], value: 1000001 });
      const unspentETH = await sale.investorUnspentETH(accounts[3]);
      assert.equal(unspentETH.toString(), 1, "unspent");

      const invested = await sale.investorInvested(accounts[3]);
      assert.equal(invested.toString(), 1000000, "invested");

      const tokens = await sale.investorTokens(accounts[3]);
      assert.equal(tokens.toString(), 2000, "tokens");
    });

    it("should not let operator add offchain investment", async function () {
      await assertRevert(sale.addOffchainInvestment(accounts[3], 1000));
    });

    describe("after a first investment", async function () {
      beforeEach(async function () {
        await sale.investETH({ from: accounts[3], value: 1000001 });
      });

      it("should have a total raised ETH", async function () {
        const saleTotalRaisedETH = await sale.totalRaisedETH();
        assert.equal(saleTotalRaisedETH.toString(), 1000000, "totalRaisedETH");
      });
   
      it("should have a total received ETH", async function () {
        const saleTotalReceivedETH = await sale.totalReceivedETH();
        assert.equal(saleTotalReceivedETH.toString(), 1000001, "totalReceivedETH");
      });
    });
  });

  describe("with a CHF tokensale on a 18 decimal tokens", async function () {
    let priceUnit = new BN(10).pow(new BN(18));
    let supply = new BN(1000000).mul(priceUnit);

    beforeEach(async function () {
      token = await Token.new("Name", "Symbol", 18, accounts[1], supply);
      await ratesProvider.defineRates([ rateWEICHF ]);
      sale = await ChangeTokensale.new(
        token.address,
        vaultERC20,
        vaultETH,
        tokenPrice,
        priceUnit,
        CHF,
        ratesProvider.address,
      );
      await token.approve(sale.address, supply, { from: accounts[1] });
    });

    it("should let investor to invest in ETH", async function () {
      const tx = await sale.investETH({ from: accounts[3], value: investmentWEI });
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs[0].event, "Investment", "event");
      assert.equal(tx.logs[0].args.investor.toString(), accounts[3], "investor");
      assert.equal(tx.logs[0].args.invested.toString(), 20743, "amount investment");
      assert.equal(tx.logs[0].args.tokens.toString(),
        "41486000000000000000", "tokens");
      assert.equal(tx.logs[1].event, "WithdrawETH", "event");
      assert.equal(tx.logs[1].args.amount.toString(), "1000965111229069150", "amount withdraw");
    });

    it("should let operator add 100CHF offchain investment", async function () {
      const tx = await sale.addOffchainInvestment(accounts[3], 10000);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs[0].event, "Investment", "event");
      assert.equal(tx.logs[0].args.investor.toString(), accounts[3], "investor");
      assert.equal(tx.logs[0].args.invested.toString(), 10000, "amount investment");
      assert.equal(tx.logs[0].args.tokens.toString(),
        new BN(20).mul(priceUnit).toString(), "tokens");
    });
  });
});
