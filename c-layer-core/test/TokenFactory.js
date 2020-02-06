"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("./helpers/assertRevert");
const TokenDelegate = artifacts.require("TokenDelegate.sol");
const TokenCore = artifacts.require("TokenCore.sol");
const TokenFactory = artifacts.require("TokenFactory.sol");
const TokenProxy = artifacts.require("TokenProxy.sol");

const TOKEN_DEPLOYMENT_COST = "1086259";
const CAN_TRANSFER = 5; // LOCKED

const NULL_ADDRESS = "0x".padEnd(42, "0");
const NAME = "Token";
const SYMBOL = "TKN";
const DECIMALS = 18;
const LOCK_END = "" + Math.floor((new Date().getTime() + 3600 * 24 * 365) / 1000);
const SUPPLIES_DECIMALS = "000000000000000000";
const SUPPLIES = [42 * 10 ** 6 + SUPPLIES_DECIMALS, 24 * 10 ** 6 + SUPPLIES_DECIMALS];
const TOTAL_SUPPLY = 66 * 10 ** 6 + SUPPLIES_DECIMALS;

const REQUIRED_CORE_PRIVILEGES = [
  web3.utils.sha3("assignProxyOperators(address,bytes32,address[])"),
  web3.utils.sha3("defineToken(address,uint256,string,string,uint256)"),
  web3.utils.sha3("defineAuditSelector(address,uint256,address[],bool[])"),
].map((x) => x.substr(0, 10));
const REQUIRED_PROXY_PRIVILEGES = [
  web3.utils.sha3("mintAtOnce(address,address[],uint256[])"),
  web3.utils.sha3("defineLock(address,uint256,uint256,address[])"),
  web3.utils.sha3("defineRules(address,address[])"),
].map((x) => x.substr(0, 10));
const REVIEW_PRIVILEGES = [
  web3.utils.sha3("reviewToken(address)"),
];
const ISSUER_PRIVILEGES = [
  web3.utils.sha3("configureTokensales(address,address[],uint256[])"),
  web3.utils.sha3("updateAllowances(address,address[],uint256[])"),
];
const FACTORY_CORE_ROLE = web3.utils.fromAscii("FactoryCoreRole").padEnd(66, "0");
const FACTORY_PROXY_ROLE = web3.utils.fromAscii("FactoryProxyRole").padEnd(66, "0");
const ISSUER_PROXY_ROLE = web3.utils.fromAscii("IssuerProxyRole").padEnd(66, "0");
const REVIEWER_PROXY_ROLE = web3.utils.fromAscii("ReviewerProxyRole").padEnd(66, "0");

contract("TokenFactory", function (accounts) {
  let proxyCode, proxyCodeHash;
  let delegate, core, factory;

  const VAULTS = [accounts[2], accounts[3]];

  beforeEach(async function () {
    delegate = await TokenDelegate.new();
    core = await TokenCore.new("MyCore");
    await core.defineTokenDelegate(0, delegate.address, []);
    factory = await TokenFactory.new(core.address);

    proxyCode = TokenProxy.bytecode;
    proxyCodeHash = web3.utils.sha3(proxyCode);
  });

  it("should have a core", async function () {
    const coreAddress = await factory.core();
    assert.equal(coreAddress, core.address, "core address");
  });

  it("should prevent non authorized to define a proxy code", async function () {
    await assertRevert(factory.defineProxyCode(proxyCode, { from: accounts[1] }), "OA01");
  });

  it("should let operator define a proxy code", async function () {
    const tx = await factory.defineProxyCode(proxyCode);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "ProxyCodeDefined", "event");
    assert.equal(tx.logs[0].args.codeHash, proxyCodeHash, "proxy codeHash");
  });

  it("should prevent non authorized to define a proxy code", async function () {
    await assertRevert(factory.deployToken(
      0, NAME, SYMBOL, DECIMALS, LOCK_END,
      [accounts[0], factory.address], SUPPLIES, [accounts[0]]), "TF01");
  });

  describe("With proxy code defined and core authorizations", function () {
    beforeEach(async function () {
      await factory.defineProxyCode(proxyCode);
      await core.defineRole(FACTORY_CORE_ROLE, REQUIRED_CORE_PRIVILEGES);
      await core.assignOperators(FACTORY_CORE_ROLE, [factory.address]);
      await core.defineRole(FACTORY_PROXY_ROLE, REQUIRED_PROXY_PRIVILEGES);
    });

    it("should estimate a new token deployment", async function () {
      const gasCost = await factory.deployToken.estimateGas(
        0, NAME, SYMBOL, DECIMALS, LOCK_END,
        VAULTS, SUPPLIES, [accounts[0]]);
      assert.equal(gasCost, TOKEN_DEPLOYMENT_COST, "gas cost");
    });

    it("should deploy a new token", async function () {
      const tx = await factory.deployToken(
        0, NAME, SYMBOL, DECIMALS, LOCK_END,
        VAULTS, SUPPLIES, [accounts[0]]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "TokenDeployed", "event");
      assert.equal(tx.logs[0].args.token.length, 42, "proxy address length");
      assert.ok(tx.logs[0].args.token !== NULL_ADDRESS, "proxy address not null");
    });

    describe("With a token deployed", function () {
      let token;

      beforeEach(async function () {
        const tx = await factory.deployToken(
          0, NAME, SYMBOL, DECIMALS, LOCK_END,
          [factory.address, factory.address], SUPPLIES, [accounts[0]]);
        const tokenAddress = tx.logs[0].args.token;
        token = await TokenProxy.at(tokenAddress);
      });

      it("should have a token", async function () {
        const name = await token.name();
        assert.equal(name, NAME, "name");
        const symbol = await token.symbol();
        assert.equal(symbol, SYMBOL, "symbol");
        const decimals = await token.decimals();
        assert.equal(decimals, DECIMALS, "decimals");
        const totalSupply = await token.totalSupply();
        assert.equal(totalSupply.toString(), TOTAL_SUPPLY, "total supply");
      });

      it("should have roles defined", async function () {
        const factoryRole = await core.proxyRole(token.address, factory.address);
        assert.equal(factoryRole, FACTORY_PROXY_ROLE, "factory role");
        const issuerRole = await core.proxyRole(token.address, accounts[0]);
        assert.equal(issuerRole, ISSUER_PROXY_ROLE, "issuer role");
      });

      it("should have token data", async function () {
        const tokenData = await core.token(token.address);
        assert.ok(tokenData.mintingFinished, "mintingFinished");
        assert.equal(tokenData.allTimeIssued, 0, "all time issued");
        assert.equal(tokenData.allTimeRedeemed, 0, "all time issued");
        assert.equal(tokenData.allTimeSeized, 0, "all time issued");
        assert.deepEqual(tokenData.lock.map((x) => x.toString()), ["0", LOCK_END], "lock");
        assert.deepEqual(tokenData.rules, [factory.address], "rules");
        assert.deepEqual(tokenData.claimables, [], "claimables");
      });

      it("should return canTransfer tokens", async function () {
        const canTransfer = await token.canTransfer.call(accounts[2], accounts[0], 1);
        assert.equal(canTransfer.toString(), CAN_TRANSFER, "canTransfer locked");
      });

      it("should not be possible to transfer tokens", async function () {
        await assertRevert(token.transfer(accounts[0], 1, { from: accounts[2] }), "CO03");
      });

      it("should not let non proxy operator to review token", async function () {
        await assertRevert(factory.reviewToken(token.address, { from: accounts[1] }), "OA01");
      });

      it("should not let non proxy operator to configure tokensale", async function () {
        await assertRevert(factory.configureTokensales(token.address, [], []), "OA02");
      });

      it("should not let non proxy operator to update allowances", async function () {
        await assertRevert(factory.updateAllowances(token.address, [], []), "OA02");
      });

      describe("With reviewer authorizations", function () {
        beforeEach(async function () {
          await core.defineRole(REVIEWER_PROXY_ROLE, REVIEW_PRIVILEGES);
          await core.assignOperators(REVIEWER_PROXY_ROLE, [accounts[1]]);
        });

        it("should let reviewer review token with no selectors", async function () {
          const tx = await factory.reviewToken(token.address, { from: accounts[1] });
          assert.ok(tx.receipt.status, "Status");
          assert.equal(tx.logs.length, 1);
          assert.equal(tx.logs[0].event, "TokenReviewed", "event");
          assert.equal(tx.logs[0].args.token, token.address, "token");
        });

        it("should let reviewer review token with selectors", async function () {
          const tx = await factory.reviewToken(token.address, { from: accounts[1] });
          assert.ok(tx.receipt.status, "Status");
          assert.equal(tx.logs.length, 1);
          assert.equal(tx.logs[0].event, "TokenReviewed", "event");
          assert.equal(tx.logs[0].args.token, token.address, "token");
        });
      });

      describe("With issuer authorizations", function () {
        beforeEach(async function () {
          await core.defineRole(ISSUER_PROXY_ROLE, ISSUER_PRIVILEGES);
        });

        it("should let issuer configure tokensales with no tokensales", async function () {
          const tx = await factory.configureTokensales(token.address, [], []);
          assert.ok(tx.receipt.status, "Status");
          assert.equal(tx.logs.length, 1);
          assert.equal(tx.logs[0].event, "TokensalesConfigured", "event");
          assert.equal(tx.logs[0].args.token, token.address, "token");
          assert.deepEqual(tx.logs[0].args.tokensales, [], "tokensales");
        });

        it("should let issuer configure tokensales with tokensales", async function () {
          const tx = await factory.configureTokensales(token.address,
            [accounts[1], accounts[2]], ["10000", "20000"]);
          assert.ok(tx.receipt.status, "Status");
          assert.equal(tx.logs.length, 3);
          assert.equal(tx.logs[2].event, "TokensalesConfigured", "event");
          assert.equal(tx.logs[2].args.token, token.address, "token");
          assert.deepEqual(tx.logs[2].args.tokensales, [accounts[1], accounts[2]], "tokensales");
        });

        it("should let issuer update allowances with no spenders", async function () {
          const tx = await factory.updateAllowances(token.address, [], []);
          assert.ok(tx.receipt.status, "Status");
          assert.equal(tx.logs.length, 0);
        });

        it("should let issuer update allowance with spenders", async function () {
          const tx = await factory.updateAllowances(token.address, [accounts[1], accounts[2]], ["0", "100000"]);
          assert.ok(tx.receipt.status, "Status");
          assert.equal(tx.logs.length, 2);
          assert.equal(tx.logs[0].event, "AllowanceUpdated", "event1");
          assert.equal(tx.logs[0].args.token, token.address, "token1");
          assert.equal(tx.logs[0].args.spender, accounts[1], "spender1");
          assert.equal(tx.logs[0].args.allowance, "0", "allowance1");
          assert.equal(tx.logs[1].event, "AllowanceUpdated", "event2");
          assert.equal(tx.logs[1].args.token, token.address, "token2");
          assert.equal(tx.logs[1].args.spender, accounts[2], "spender2");
          assert.equal(tx.logs[1].args.allowance, "100000", "allowance2");
        });
      });
    });
  });
});
