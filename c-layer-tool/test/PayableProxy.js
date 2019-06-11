"user strict";

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require("./helpers/assertRevert");
const PayableProxy = artifacts.require("../contracts/PayableProxy.sol");
const ContractMock = artifacts.require("../contracts/mock/ContractMock.sol");

contract("PayableProxy", function (accounts) {
  let payableProxy;
  let contractMock;
  let yersteday = Math.round(new Date().getTime() / 1000) - 24 * 3600;
  let tomorrow = Math.round(new Date().getTime() / 1000) + 24 * 3600;

  const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
  const defaultFunc = "func(address, bytes)";
  const defaultFuncAbi = "0x9981f2a9";
  const defaultData = defaultFuncAbi + accounts[0].toLowerCase().substring(2);

  beforeEach(async function () {
    contractMock = await ContractMock.new();
    payableProxy = await PayableProxy.new(contractMock.address, defaultFunc, yersteday);
  });

  it("should provide the payable addr", async function () {
    const payableAddr = await payableProxy.payableAddr();
    assert.equal(payableAddr, contractMock.address, "payableAddr");
  });

  it("should provide the payable function", async function () {
    const payableFunction = await payableProxy.payableFunction();
    assert.equal(payableFunction, "0x9981f2a9", "payableFunction");
  });

  it("should provide the start datetime", async function () {
    const startAt = await payableProxy.startAt();
    assert.equal(startAt.toNumber(), yersteday, "startAt");
  });

  it("should provide the lock status", async function () {
    const configLocked = await payableProxy.isConfigLocked();
    assert.equal(configLocked, false, "configLocked");
  });

  it("should dryRun the call to payable", async function () {
    const tx = await payableProxy.dryRun();
    assert.ok(tx.receipt.status, "success");

    const events = await contractMock.getPastEvents("allEvents");
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "LogMsg");
    assert.equal(events[0].args.sender, payableProxy.address, "sender");
    assert.equal(events[0].args.origin, accounts[0], "origin");
    assert.equal(web3.utils.fromWei(events[0].args.value, "ether"), "0", "value");
   
    const data = defaultData + web3.utils.fromAscii("test").substring(2);
    assert.equal(events[0].args.data, data, "data");
  });

  it("should lock the configuration", async function () {
    const tx = await payableProxy.lockConfig();
    assert.ok(tx.receipt.status, "status");
    assert.equal(tx.logs.length, 1, "logs");
    assert.equal(tx.logs[0].event, "ConfigLocked", "log name");

    assert.equal(await payableProxy.isConfigLocked(), true, "isConfigLocked");
  });

  describe("when still unlocked", function () {
    it("should reject value transfer", async function () {
      const wei = web3.utils.toWei("1", "ether");
      await assertRevert(web3.eth.sendTransaction({
        from: accounts[0],
        to: payableProxy.address,
        value: wei,
      }));
    });

    it("should prevent non owner to redefined proxy", async function () {
      await assertRevert(
        payableProxy.configure(NULL_ADDRESS, "0x", tomorrow, { from: accounts[1] }),
        "INVALID_ARGUMENT");
    });

    it("should let owner redefined the proxy", async function () {
      const tx = await payableProxy.configure(NULL_ADDRESS, "0x", tomorrow);
      assert.ok(tx.receipt.status, "status");
      assert.equal(tx.logs.length, 1, "logs");
      assert.equal(tx.logs[0].event, "NewConfig", "log name");
      assert.equal(tx.logs[0].args.payableAddr, NULL_ADDRESS, "payableAddr");
      assert.equal(tx.logs[0].args.payableAbi, null, "payableFunc");
      assert.equal(tx.logs[0].args.startAt.toNumber(), tomorrow, "startAt");

      assert.equal(await payableProxy.payableAddr(), NULL_ADDRESS, "payableAddr");
      assert.equal(await payableProxy.payableFunction(), "0x39bef177", "payableFunc");
      assert.equal(await payableProxy.startAt(), tomorrow, "startAt");
    });
  });

  describe("when locked", function () {
    beforeEach(async function () {
      await payableProxy.lockConfig();
    });

    it("should accept value transfer", async function () {
      const wei = web3.utils.toWei("1", "ether");
      const receipt = await web3.eth.sendTransaction({
        from: accounts[0],
        to: payableProxy.address,
        value: wei,
      });
      assert.ok(receipt.status, "status");

      const events = await contractMock.getPastEvents('LogMsg');
      assert.equal(events.length, 1);
      assert.equal(events[0].event, "LogMsg");
      assert.equal(events[0].args.sender, payableProxy.address, "sender");
      assert.equal(events[0].args.origin, accounts[0], "origin");
      assert.equal(web3.utils.fromWei(events[0].args.value, "ether"), "1", "value");

      assert.equal(events[0].args.data, defaultData, "data");
    });

    describe("and chain with a second locked proxy", function () {
      let callingContract;

      const emptyFunc = "";
      const emptyFuncAbi = "0xc5d24601";

      beforeEach(async function () {
        callingContract = await PayableProxy.new(payableProxy.address, emptyFunc, yersteday);
        await callingContract.lockConfig();
      });

      it("should accept and have correct sender/origin/data", async function () {
        const receipt = await web3.eth.sendTransaction({
          from: accounts[0],
          to: callingContract.address,
          value: web3.utils.toWei("1", "ether"),
        });
        assert.ok(receipt.status, "status");

        const events = await contractMock.getPastEvents('LogMsg');
        assert.equal(events.length, 1);
        assert.equal(events[0].event, "LogMsg");
        assert.equal(events[0].args.sender, payableProxy.address, "sender");
        assert.equal(events[0].args.origin, accounts[0], "origin");
        assert.equal(web3.utils.fromWei(events[0].args.value, "ether"), "1", "value");

        const callingContractData = emptyFuncAbi + accounts[0].toLowerCase().substring(2);
        const data = defaultFuncAbi +
          callingContract.address.toLowerCase().substring(2) +
          callingContractData.substring(2);
        assert.equal(events[0].args.data, data, "data");
      });
    });
  });
});
