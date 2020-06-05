"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const { assertAuditLog, assertTransferLog } = require("../helpers/assertLog");
const AuditableDelegateMock = artifacts.require("AuditableDelegateMock.sol");
const UserRegistryMock = artifacts.require("UserRegistryMock.sol");
const RatesProviderMock = artifacts.require("RatesProviderMock.sol");

const SUPPLY = 1000000;
const NAME = "Token";
const SYMBOL = "TKN";
const SYMBOL_BYTES = web3.utils.toHex(SYMBOL).padEnd(66, "0");
const DECIMALS = 18;
const CHF = "CHF";
const CHF_BYTES = web3.utils.toHex(CHF).padEnd(66, "0");
const TOKEN_ADDRESS = "0x" + "123456789".padStart(40, "0");
const NULL_ADDRESS = "0x".padEnd(42, "0");
const EMPTY_BYTES = "0x".padEnd(66, "0");
const NEXT_YEAR = Math.floor(new Date().getTime() / 1000) + (24 * 3600 * 365);

// Estimate
const ESTIMATE_NO_AUDIT_REQUIRED = 0;
const ESTIMATE_NO_AUDiT_UPDATE_AUDIT = 0;
const ESTIMATE_FULL_CONFIGS = 0;
const ESTIMATE_ONE_DATE_FIELD_AUDIT = 0;
const ESTIMATE_ONE_UINT_FIELD_AUDIT = 0;
const ESTIMATE_FOUR_FIELD_AUDIT = 0;

// Audit Mode
const AUDIT_NEVER = 0;
const AUDIT_ALWAYS = 1;
const AUDIT_ALWAYS_TRIGGERS_EXCLUDED = 2;
const AUDIT_TRIGGERS_ONLY = 3;
const AUDIT_WHEN_TRIGGERS_MATCHED = 4;
const AUDIT_WHEN_TRIGGERS_UNMATCHED = 5;

// Audit Storage
const AUDIT_STORAGE_ADDRESS = 0;
const AUDIT_STORAGE_USER_ID = 1;
const AUDIT_STORAGE_SHARED = 2;

// Test Configurations
const CONFIGURATIONS = {
  "never": [
    0, 0, false,
    AUDIT_NEVER, AUDIT_STORAGE_ADDRESS,
    [], [], NULL_ADDRESS, "0x",
    [true, true, true, true]
  ],
  "alwaysAddress": [
    1, 1, true,
    AUDIT_ALWAYS, AUDIT_STORAGE_ADDRESS,
    [], [], NULL_ADDRESS, "0x",
    [true, true, true, true]
  ],
   "alwaysGlobal": [
    2, 1, false,
    AUDIT_ALWAYS, AUDIT_STORAGE_ADDRESS,
    [], [], NULL_ADDRESS, "0x",
    [true, true, true, true]
  ],
   "alwaysUserId": [
    3, 1, false,
    AUDIT_ALWAYS, AUDIT_STORAGE_USER_ID,
    [], [], NULL_ADDRESS, "0x",
    [true, true, true, true]
  ],
   "alwaysShared": [
    4, 1, false,
    AUDIT_ALWAYS, AUDIT_STORAGE_SHARED,
    [], [], NULL_ADDRESS, "0x",
    [true, true, true, true]
  ],
  "triggersOnly": [
    5, 2, false,
    AUDIT_TRIGGERS_ONLY, AUDIT_STORAGE_ADDRESS,
    [], [], NULL_ADDRESS, "0x",
    [true, true, true, true]
  ],
  "alwaysTriggersExcluded": [
    6, 3, false,
    AUDIT_ALWAYS_TRIGGERS_EXCLUDED, AUDIT_STORAGE_ADDRESS,
    [], [], NULL_ADDRESS, "0x",
    [true, true, true, true]
  ],
  "whenTriggersMatched": [
    7, 4, false,
    AUDIT_WHEN_TRIGGERS_MATCHED, AUDIT_STORAGE_ADDRESS,
    [], [], NULL_ADDRESS, "0x",
    [true, true, true, true]
  ],
  "whenTriggersUnmatched": [
    8, 5, false,
    AUDIT_WHEN_TRIGGERS_UNMATCHED, AUDIT_STORAGE_ADDRESS,
    [], [], NULL_ADDRESS, "0x",
    [true, true, true, true]
  ],
  "alwaysDifferentCurrency": [
    9, 6, false,
    AUDIT_ALWAYS, AUDIT_STORAGE_ADDRESS,
    [], [], NULL_ADDRESS, CHF_BYTES,
    [true, true, true, true]
  ],
  "alwaysCreatedAt": [
    10, 7, false,
    AUDIT_ALWAYS, AUDIT_STORAGE_ADDRESS,
    [], [], NULL_ADDRESS, "0x",
    [true, false, false, false]
  ],
   "alwaysLastTransactionAt": [
    11, 7, false,
    AUDIT_ALWAYS, AUDIT_STORAGE_ADDRESS,
    [], [], NULL_ADDRESS, "0x",
    [false, true, false, false]
  ],
   "alwaysCumulatedEmission": [
    12, 7, false,
    AUDIT_ALWAYS, AUDIT_STORAGE_ADDRESS,
    [], [], NULL_ADDRESS, "0x",
    [false, false, true, false]
  ],
   "alwaysCumulatedReception": [
    13, 7, false,
    AUDIT_ALWAYS, AUDIT_STORAGE_ADDRESS,
    [], [], NULL_ADDRESS, "0x",
    [false, false, false, true]
  ],
 };

const EMPTY_AUDIT = {
  createdAt: "0",
  lastTransactionAt: "0",
  cumulatedEmission: "0",
  cumulatedReception: "0"
};

const getBlockTime = async function (blockNumber) {
  return await web3.eth.getBlock(
    blockNumber).then((block) => (""+block.timestamp));
}

contract("AuditableDelegate", function (accounts) {
  let delegate, userRegistry, ratesProvider;

  beforeEach(async function () {
     delegate = await AuditableDelegateMock.new();
     await delegate.defineUsers(
       [ accounts[0], accounts[1], accounts[2] ], [ 0, 1000, 2500 ], [ 0, 2000, 500 ]);

     ratesProvider = delegate;
     userRegistry = delegate;

     Object.values(CONFIGURATIONS).forEach((config) => {
       if(config[8] != "0x") {
         // Setting which rates provider to use
         config[7] = ratesProvider.address;
       }
     });
  });

  describe("and audit mode NEVER is configured", function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.never);
    });

    it("should have no audits required", async function () {
      const auditsRequired = await delegate.assertIsAuditRequired(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000", 0);
      assert.ok(!auditsRequired, "success");
    });

    it("should process the configured NEVER audit", async function () {
      const tx = await delegate.testUpdateAudit(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        0);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 4);
      assert.equal(tx.logs[0].event, "LogTransferData", "event");
      assertTransferLog(tx.logs[0].args, {
        token: TOKEN_ADDRESS,
        caller: accounts[0],
        sender: accounts[1],
        receiver: accounts[2],
        senderId: "0",
        senderKeys: [],
        senderFetched: false,
        receiverId: "0",
        receiverKeys: [],
        receiverFetched: false,
        value: "1000",
        convertedValue: "0"
      }, "No audits");
      for(var i=1; i<tx.logs.length; i++) {
        assert.equal(tx.logs[i].event, "LogAuditData", "event ["+i+"]");
        assertAuditLog(tx.logs[i].args, EMPTY_AUDIT, "audit ["+i+"]");
      }
    });

    it("should process no audits", async function () {
      const tx = await delegate.testUpdateAllAudits(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        []);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "LogTransferData", "event");
      assertTransferLog(tx.logs[0].args, {
        token: TOKEN_ADDRESS,
        caller: accounts[0],
        sender: accounts[1],
        receiver: accounts[2],
        senderId: "0",
        senderKeys: [],
        senderFetched: false,
        receiverId: "0",
        receiverKeys: [],
        receiverFetched: false,
        value: "1000",
        convertedValue: "0"
      }, "No audits");
    });

    it("should process many audits", async function () {
      const tx = await delegate.testUpdateAllAudits(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        [0, 1]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 4);
      assert.equal(tx.logs[0].event, "LogTransferData", "event");
      assertTransferLog(tx.logs[0].args, {
        token: TOKEN_ADDRESS,
        caller: accounts[0],
        sender: accounts[1],
        receiver: accounts[2],
        senderId: "0",
        senderKeys: [],
        senderFetched: false,
        receiverId: "0",
        receiverKeys: [],
        receiverFetched: false,
        value: "1000",
        convertedValue: "0"
      }, "transfer log");
      for(var i=1; i<tx.logs.length; i++) {
        assert.equal(tx.logs[i].event, "LogAuditData", "event ["+i+"]");
        assertAuditLog(tx.logs[i].args, EMPTY_AUDIT, "audit ["+i+"]");
      }
    });
  });

  describe("and one audit mode (ALWAYS x ADDRESS) configured", function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.alwaysAddress);
    });

    it("should have the configured audit required", async function () {
      const success = await delegate.assertIsAuditRequired(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        CONFIGURATIONS.alwaysAddress[0]);
      assert.ok(success, "success");
    });

    it("should process the configured audit", async function () {
      const tx = await delegate.testUpdateAudit(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        CONFIGURATIONS.alwaysAddress[0]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 4);
      assert.equal(tx.logs[0].event, "LogTransferData", "event");
      assertTransferLog(tx.logs[0].args, {
        token: TOKEN_ADDRESS,
        caller: accounts[0],
        sender: accounts[1],
        receiver: accounts[2],
        senderId: "0",
        senderKeys: [],
        senderFetched: false,
        receiverId: "0",
        receiverKeys: [],
        receiverFetched: false,
        value: "1000",
        convertedValue: "0"
      }, "transfer log");

      const timestamp = await getBlockTime(tx.receipt.blockNumber);
      const senderAudit = {
        createdAt: timestamp,
        lastTransactionAt: timestamp,
        cumulatedEmission: "1000",
        cumulatedReception: "0"
      };
      const receiverAudit = {
        createdAt: timestamp,
        lastTransactionAt: timestamp,
        cumulatedEmission: "0",
        cumulatedReception: "1000"
      };
      [EMPTY_AUDIT, senderAudit, receiverAudit].map((audit, i) => {
        let logId = i+1;
        assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
        assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
      });
    });
  });

  describe("and one audit mode (GLOBAL x ALWAYS x ADDRESS) configured", function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.alwaysGlobal);
    });

    it("should have the configured audit required", async function () {
      const success = await delegate.assertIsAuditRequired(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        CONFIGURATIONS.alwaysGlobal[0]);
      assert.ok(success, "success");
    });

    it("should process the configured audit", async function () {
      const tx = await delegate.testUpdateAudit(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        CONFIGURATIONS.alwaysGlobal[0]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 4);
      assert.equal(tx.logs[0].event, "LogTransferData", "event");
      assertTransferLog(tx.logs[0].args, {
        token: TOKEN_ADDRESS,
        caller: accounts[0],
        sender: accounts[1],
        receiver: accounts[2],
        senderId: "0",
        senderKeys: [],
        senderFetched: false,
        receiverId: "0",
        receiverKeys: [],
        receiverFetched: false,
        value: "1000",
        convertedValue: "0"
      }, "transfer log");

      const timestamp = await getBlockTime(tx.receipt.blockNumber);
      const senderAudit = {
        createdAt: timestamp,
        lastTransactionAt: timestamp,
        cumulatedEmission: "1000",
        cumulatedReception: "0"
      };
      const receiverAudit = {
        createdAt: timestamp,
        lastTransactionAt: timestamp,
        cumulatedEmission: "0",
        cumulatedReception: "1000"
      };
      [EMPTY_AUDIT, senderAudit, receiverAudit].map((audit, i) => {
        let logId = i+1;
        assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
        assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
      });
    });
  });

  describe("and one audit mode (ALWAYS x USER_ID) configured", function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.alwaysUserId);
    });

    it("should have the configured audit required", async function () {
      const success = await delegate.assertIsAuditRequired(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        CONFIGURATIONS.alwaysUserId[0]);
      assert.ok(success, "success");
    });

    it("should process the configured audit", async function () {
      const tx = await delegate.testUpdateAudit(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        CONFIGURATIONS.alwaysUserId[0]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 6);
      assert.equal(tx.logs[0].event, "LogTransferData", "event");
      assertTransferLog(tx.logs[0].args, {
        token: TOKEN_ADDRESS,
        caller: accounts[0],
        sender: accounts[1],
        receiver: accounts[2],
        senderId: "2",
        senderKeys: [],
        senderFetched: true,
        receiverId: "3",
        receiverKeys: [],
        receiverFetched: true,
        value: "1000",
        convertedValue: "0"
      }, "transfer log");

      const timestamp = await getBlockTime(tx.receipt.blockNumber);
      const senderAudit = {
        createdAt: timestamp,
        lastTransactionAt: timestamp,
        cumulatedEmission: "1000",
        cumulatedReception: "0"
      };
      const receiverAudit = {
        createdAt: timestamp,
        lastTransactionAt: timestamp,
        cumulatedEmission: "0",
        cumulatedReception: "1000"
      };
      [EMPTY_AUDIT, EMPTY_AUDIT, EMPTY_AUDIT, senderAudit, receiverAudit].map((audit, i) => {
        let logId = i+1;
        assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
        assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
      });
    });
  });

  describe("and one audit mode (ALWAYS x SHARED) configured", function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.alwaysShared);
    });

    it("should have the configured audit required", async function () {
      const success = await delegate.assertIsAuditRequired(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        CONFIGURATIONS.alwaysShared[0]);
      assert.ok(success, "success");
    });

    it("should process the configured audit", async function () {
      const tx = await delegate.testUpdateAudit(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        CONFIGURATIONS.alwaysShared[0]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 4);
      assert.equal(tx.logs[0].event, "LogTransferData", "event");
      assertTransferLog(tx.logs[0].args, {
        token: TOKEN_ADDRESS,
        caller: accounts[0],
        sender: accounts[1],
        receiver: accounts[2],
        senderId: "0",
        senderKeys: [],
        senderFetched: false,
        receiverId: "0",
        receiverKeys: [],
        receiverFetched: false,
        value: "1000",
        convertedValue: "0"
      }, "transfer log");

      const timestamp = await getBlockTime(tx.receipt.blockNumber);
      const sharedAudit = {
        createdAt: timestamp,
        lastTransactionAt: timestamp,
        cumulatedEmission: "1000",
        cumulatedReception: "1000"
      };
      [sharedAudit, EMPTY_AUDIT, EMPTY_AUDIT].map((audit, i) => {
        let logId = i+1;
        assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
        assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
      });
    });
  });

  describe("and one audit mode (TRIGGERS ONLY) configured", function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.triggersOnly);
    });

    describe("with no triggers defined", function () {
      it("should have the configured audit required", async function () {
        const success = await delegate.assertIsAuditRequired(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.triggersOnly[0]);
        assert.ok(!success, "success");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.triggersOnly[0]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 4);
        assert.equal(tx.logs[0].event, "LogTransferData", "event");
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: "0",
          senderKeys: [],
          senderFetched: false,
          receiverId: "0",
          receiverKeys: [],
          receiverFetched: false,
          value: "1000",
          convertedValue: "0"
        }, "transfer log");

        [EMPTY_AUDIT, EMPTY_AUDIT, EMPTY_AUDIT].map((audit, i) => {
          let logId = i+1;
          assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
          assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
        });
      });
    });
    describe("with token defined as a trigger", function () {
      beforeEach(async function () {
        await delegate.defineAuditTriggers(CONFIGURATIONS.triggersOnly[0],
          [TOKEN_ADDRESS], [true], [false], [false]);
      });

      it("should have the configured audit required", async function () {
        const success = await delegate.assertIsAuditRequired(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.triggersOnly[0]);
        assert.ok(success, "success");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.triggersOnly[0]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 4);
        assert.equal(tx.logs[0].event, "LogTransferData", "event");
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: "0",
          senderKeys: [],
          senderFetched: false,
          receiverId: "0",
          receiverKeys: [],
          receiverFetched: false,
          value: "1000",
          convertedValue: "0"
        }, "transfer log");

        const timestamp = await getBlockTime(tx.receipt.blockNumber);
        [EMPTY_AUDIT, EMPTY_AUDIT, EMPTY_AUDIT].map((audit, i) => {
          let logId = i+1;
          assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
          assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
        });
      });
    });

    describe("with sender defined as a trigger", function () {
      beforeEach(async function () {
         await delegate.defineAuditTriggers(CONFIGURATIONS.triggersOnly[0],
          [accounts[1]], [false], [true], [false]);
      });

      it("should have the configured audit required", async function () {
        const success = await delegate.assertIsAuditRequired(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.triggersOnly[0]);
        assert.ok(success, "success");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.triggersOnly[0]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 4);
        assert.equal(tx.logs[0].event, "LogTransferData", "event");
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: "0",
          senderKeys: [],
          senderFetched: false,
          receiverId: "0",
          receiverKeys: [],
          receiverFetched: false,
          value: "1000",
          convertedValue: "0"
        }, "transfer log");

        const timestamp = await getBlockTime(tx.receipt.blockNumber);
        const senderAudit = {
          createdAt: timestamp,
          lastTransactionAt: timestamp,
          cumulatedEmission: "1000",
          cumulatedReception: "0"
        };
        [EMPTY_AUDIT, senderAudit, EMPTY_AUDIT].map((audit, i) => {
          let logId = i+1;
          assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
          assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
        });
      });
     });

    describe("with receiver defined as a trigger", function () {
      beforeEach(async function () {
        await delegate.defineAuditTriggers(CONFIGURATIONS.triggersOnly[0],
          [accounts[2]], [false], [false], [true]);
      });

      it("should have the configured audit required", async function () {
        const success = await delegate.assertIsAuditRequired(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.triggersOnly[0]);
        assert.ok(success, "success");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.triggersOnly[0]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 4);
        assert.equal(tx.logs[0].event, "LogTransferData", "event");
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: "0",
          senderKeys: [],
          senderFetched: false,
          receiverId: "0",
          receiverKeys: [],
          receiverFetched: false,
          value: "1000",
          convertedValue: "0"
        }, "transfer log");

        const timestamp = await getBlockTime(tx.receipt.blockNumber);
        const receiverAudit = {
          createdAt: timestamp,
          lastTransactionAt: timestamp,
          cumulatedEmission: "0",
          cumulatedReception: "1000"
        };
        [EMPTY_AUDIT, EMPTY_AUDIT, receiverAudit].map((audit, i) => {
          let logId = i+1;
          assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
          assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
        });
      });
    });
  });

  describe("and one audit mode (ALWAYS TRIGGERS EXCLUDED) configured", function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.alwaysTriggersExcluded);
    });

    describe("with no triggers defined", function () {
      it("should have the configured audit required", async function () {
        const success = await delegate.assertIsAuditRequired(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.alwaysTriggersExcluded[0]);
        assert.ok(success, "success");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.alwaysTriggersExcluded[0]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 4);
        assert.equal(tx.logs[0].event, "LogTransferData", "event");
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: "0",
          senderKeys: [],
          senderFetched: false,
          receiverId: "0",
          receiverKeys: [],
          receiverFetched: false,
          value: "1000",
          convertedValue: "0"
        }, "transfer log");

        const timestamp = await getBlockTime(tx.receipt.blockNumber);
        const senderAudit = {
          createdAt: timestamp,
          lastTransactionAt: timestamp,
          cumulatedEmission: "1000",
          cumulatedReception: "0"
        };
        const receiverAudit = {
          createdAt: timestamp,
          lastTransactionAt: timestamp,
          cumulatedEmission: "0",
          cumulatedReception: "1000"
        };
        [EMPTY_AUDIT, senderAudit, receiverAudit].map((audit, i) => {
          let logId = i+1;
          assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
          assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
        });
      });
    });

    describe("with token defined as a trigger", function () {
      beforeEach(async function () {
        await delegate.defineAuditTriggers(CONFIGURATIONS.alwaysTriggersExcluded[0],
          [TOKEN_ADDRESS], [true], [false], [false]);
      });

      it("should have the configured audit required", async function () {
        const success = await delegate.assertIsAuditRequired(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.alwaysTriggersExcluded[0]);
        assert.ok(!success, "no audit");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.alwaysTriggersExcluded[0]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 4);
        assert.equal(tx.logs[0].event, "LogTransferData", "event");
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: "0",
          senderKeys: [],
          senderFetched: false,
          receiverId: "0",
          receiverKeys: [],
          receiverFetched: false,
          value: "1000",
          convertedValue: "0"
        }, "transfer log");

        [EMPTY_AUDIT, EMPTY_AUDIT, EMPTY_AUDIT].map((audit, i) => {
          let logId = i+1;
          assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
          assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
        });
      });
    });

    describe("with sender defined as a trigger", function () {
      beforeEach(async function () {
         await delegate.defineAuditTriggers(CONFIGURATIONS.alwaysTriggersExcluded[0],
          [accounts[1]], [false], [true], [false]);
      });

      it("should have the configured audit required", async function () {
        const success = await delegate.assertIsAuditRequired(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.alwaysTriggersExcluded[0]);
        assert.ok(success, "success");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.alwaysTriggersExcluded[0]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 4);
        assert.equal(tx.logs[0].event, "LogTransferData", "event");
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: "0",
          senderKeys: [],
          senderFetched: false,
          receiverId: "0",
          receiverKeys: [],
          receiverFetched: false,
          value: "1000",
          convertedValue: "0"
        }, "transfer log");

        const timestamp = await getBlockTime(tx.receipt.blockNumber);
        const receiverAudit = {
          createdAt: timestamp,
          lastTransactionAt: timestamp,
          cumulatedEmission: "0",
          cumulatedReception: "1000"
        };
        [EMPTY_AUDIT, EMPTY_AUDIT, receiverAudit].map((audit, i) => {
          let logId = i+1;
          assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
          assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
        });
      });
     });

    describe("with receiver defined as a trigger", function () {
      beforeEach(async function () {
        await delegate.defineAuditTriggers(CONFIGURATIONS.alwaysTriggersExcluded[0],
          [accounts[2]], [false], [false], [true]);
      });

      it("should have the configured audit required", async function () {
        const success = await delegate.assertIsAuditRequired(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.alwaysTriggersExcluded[0]);
        assert.ok(success, "success");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.alwaysTriggersExcluded[0]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 4);
        assert.equal(tx.logs[0].event, "LogTransferData", "event");
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: "0",
          senderKeys: [],
          senderFetched: false,
          receiverId: "0",
          receiverKeys: [],
          receiverFetched: false,
          value: "1000",
          convertedValue: "0"
        }, "transfer log");

        const timestamp = await getBlockTime(tx.receipt.blockNumber);
        const senderAudit = {
          createdAt: timestamp,
          lastTransactionAt: timestamp,
          cumulatedEmission: "1000",
          cumulatedReception: "0"
        };
        [EMPTY_AUDIT, senderAudit, EMPTY_AUDIT].map((audit, i) => {
          let logId = i+1;
          assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
          assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
        });
      });
    });
  });

  describe("and one audit mode (WHEN TRIGGERS MATCHED) configured", function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.whenTriggersMatched);
    });

    describe("with no triggers defined", function () {
      it("should have the configured audit required", async function () {
        const success = await delegate.assertIsAuditRequired(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.whenTriggersMatched[0]);
        assert.ok(!success, "no auditss");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.whenTriggersMatched[0]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 4);
        assert.equal(tx.logs[0].event, "LogTransferData", "event");
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: "0",
          senderKeys: [],
          senderFetched: false,
          receiverId: "0",
          receiverKeys: [],
          receiverFetched: false,
          value: "1000",
          convertedValue: "0"
        }, "transfer log");

        [EMPTY_AUDIT, EMPTY_AUDIT, EMPTY_AUDIT].map((audit, i) => {
          let logId = i+1;
          assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
          assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
        });
      });
    });

    describe("with token defined as a trigger", function () {
      beforeEach(async function () {
        await delegate.defineAuditTriggers(CONFIGURATIONS.whenTriggersMatched[0],
          [TOKEN_ADDRESS], [true], [false], [false]);
      });

      it("should have the configured audit required", async function () {
        const success = await delegate.assertIsAuditRequired(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.whenTriggersMatched[0]);
        assert.ok(success, "success");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.whenTriggersMatched[0]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 4);
        assert.equal(tx.logs[0].event, "LogTransferData", "event");
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: "0",
          senderKeys: [],
          senderFetched: false,
          receiverId: "0",
          receiverKeys: [],
          receiverFetched: false,
          value: "1000",
          convertedValue: "0"
        }, "transfer log");

        const timestamp = await getBlockTime(tx.receipt.blockNumber);
        const senderAudit = {
          createdAt: timestamp,
          lastTransactionAt: timestamp,
          cumulatedEmission: "1000",
          cumulatedReception: "0"
        };
        const receiverAudit = {
          createdAt: timestamp,
          lastTransactionAt: timestamp,
          cumulatedEmission: "0",
          cumulatedReception: "1000"
        };
        [EMPTY_AUDIT, senderAudit, receiverAudit].map((audit, i) => {
          let logId = i+1;
          assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
          assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
        });
      });
    });

    describe("with sender defined as a trigger", function () {
      beforeEach(async function () {
         await delegate.defineAuditTriggers(CONFIGURATIONS.whenTriggersMatched[0],
          [accounts[1]], [false], [true], [false]);
      });

      it("should have the configured audit required", async function () {
        const success = await delegate.assertIsAuditRequired(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.whenTriggersMatched[0]);
        assert.ok(success, "success");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.whenTriggersMatched[0]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 4);
        assert.equal(tx.logs[0].event, "LogTransferData", "event");
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: "0",
          senderKeys: [],
          senderFetched: false,
          receiverId: "0",
          receiverKeys: [],
          receiverFetched: false,
          value: "1000",
          convertedValue: "0"
        }, "transfer log");

        const timestamp = await getBlockTime(tx.receipt.blockNumber);
        const senderAudit = {
          createdAt: timestamp,
          lastTransactionAt: timestamp,
          cumulatedEmission: "1000",
          cumulatedReception: "0"
        };
         const receiverAudit = {
          createdAt: timestamp,
          lastTransactionAt: timestamp,
          cumulatedEmission: "0",
          cumulatedReception: "1000"
        };
        [EMPTY_AUDIT, senderAudit, receiverAudit].map((audit, i) => {
          let logId = i+1;
          assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
          assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
        });
      });
    });

    describe("with receiver defined as a trigger", function () {
      beforeEach(async function () {
        await delegate.defineAuditTriggers(CONFIGURATIONS.whenTriggersMatched[0],
          [accounts[2]], [false], [false], [true]);
      });

      it("should have the configured audit required", async function () {
        const success = await delegate.assertIsAuditRequired(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.whenTriggersMatched[0]);
        assert.ok(success, "success");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.whenTriggersMatched[0]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 4);
        assert.equal(tx.logs[0].event, "LogTransferData", "event");
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: "0",
          senderKeys: [],
          senderFetched: false,
          receiverId: "0",
          receiverKeys: [],
          receiverFetched: false,
          value: "1000",
          convertedValue: "0"
        }, "transfer log");

        const timestamp = await getBlockTime(tx.receipt.blockNumber);
        const senderAudit = {
          createdAt: timestamp,
          lastTransactionAt: timestamp,
          cumulatedEmission: "1000",
          cumulatedReception: "0"
        };
         const receiverAudit = {
          createdAt: timestamp,
          lastTransactionAt: timestamp,
          cumulatedEmission: "0",
          cumulatedReception: "1000"
        };
        [EMPTY_AUDIT, senderAudit, receiverAudit].map((audit, i) => {
          let logId = i+1;
          assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
          assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
        });
      });
    });
  });

  describe("and one audit mode (WHEN TRIGGERS UNMATCHED) configured", function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.whenTriggersUnmatched);
    });

    describe("with no triggers defined", function () {
      it("should have the configured audit required", async function () {
        const success = await delegate.assertIsAuditRequired(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.whenTriggersUnmatched[0]);
        assert.ok(success, "success");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.whenTriggersUnmatched[0]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 4);
        assert.equal(tx.logs[0].event, "LogTransferData", "event");
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: "0",
          senderKeys: [],
          senderFetched: false,
          receiverId: "0",
          receiverKeys: [],
          receiverFetched: false,
          value: "1000",
          convertedValue: "0"
        }, "transfer log");

        const timestamp = await getBlockTime(tx.receipt.blockNumber);
        const senderAudit = {
          createdAt: timestamp,
          lastTransactionAt: timestamp,
          cumulatedEmission: "1000",
          cumulatedReception: "0"
        };
         const receiverAudit = {
          createdAt: timestamp,
          lastTransactionAt: timestamp,
          cumulatedEmission: "0",
          cumulatedReception: "1000"
        };
        [EMPTY_AUDIT, senderAudit, receiverAudit].map((audit, i) => {
          let logId = i+1;
          assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
          assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
        });
      });
    });

    describe("with token defined as a trigger", function () {
      beforeEach(async function () {
        await delegate.defineAuditTriggers(CONFIGURATIONS.whenTriggersUnmatched[0],
          [TOKEN_ADDRESS], [true], [false], [false]);
      });

      it("should have the configured audit required", async function () {
        const success = await delegate.assertIsAuditRequired(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.whenTriggersUnmatched[0]);
        assert.ok(!success, "success");
      });

      it("should have the configured audit required", async function () {
        const success = await delegate.assertIsAuditRequired(
          NULL_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.whenTriggersUnmatched[0]);
        assert.ok(success, "success");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.whenTriggersUnmatched[0]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 4);
        assert.equal(tx.logs[0].event, "LogTransferData", "event");
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: "0",
          senderKeys: [],
          senderFetched: false,
          receiverId: "0",
          receiverKeys: [],
          receiverFetched: false,
          value: "1000",
          convertedValue: "0"
        }, "transfer log");

        [EMPTY_AUDIT, EMPTY_AUDIT, EMPTY_AUDIT].map((audit, i) => {
          let logId = i+1;
          assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
          assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
        });
      });
    });

    describe("with sender defined as a trigger", function () {
      beforeEach(async function () {
         await delegate.defineAuditTriggers(CONFIGURATIONS.whenTriggersUnmatched[0],
          [accounts[1]], [false], [true], [false]);
      });

      it("should have the configured audit required with trigger matched", async function () {
        const success = await delegate.assertIsAuditRequired(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.whenTriggersUnmatched[0]);
        assert.ok(!success, "success");
      });

      it("should have the configured audit required with trigger unmatched", async function () {
        const success = await delegate.assertIsAuditRequired(
          TOKEN_ADDRESS, accounts[0], accounts[2], accounts[1], "1000",
          CONFIGURATIONS.whenTriggersUnmatched[0]);
        assert.ok(success, "success");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.whenTriggersUnmatched[0]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 4);
        assert.equal(tx.logs[0].event, "LogTransferData", "event");
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: "0",
          senderKeys: [],
          senderFetched: false,
          receiverId: "0",
          receiverKeys: [],
          receiverFetched: false,
          value: "1000",
          convertedValue: "0"
        }, "transfer log");

        [EMPTY_AUDIT, EMPTY_AUDIT, EMPTY_AUDIT].map((audit, i) => {
          let logId = i+1;
          assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
          assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
        });
      });
    });

    describe("with receiver defined as a trigger", function () {
      beforeEach(async function () {
        await delegate.defineAuditTriggers(CONFIGURATIONS.whenTriggersUnmatched[0],
          [accounts[2]], [false], [false], [true]);
      });

      it("should have the configured audit not needed when trigger matched", async function () {
        const success = await delegate.assertIsAuditRequired(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.whenTriggersUnmatched[0]);
        assert.ok(!success, "success");
      });

      it("should have the configured audit required receiver is sender instead", async function () {
        const success = await delegate.assertIsAuditRequired(
          TOKEN_ADDRESS, accounts[0], accounts[2], accounts[1], "1000",
          CONFIGURATIONS.whenTriggersUnmatched[0]);
        assert.ok(success, "success");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          CONFIGURATIONS.whenTriggersUnmatched[0]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 4);
        assert.equal(tx.logs[0].event, "LogTransferData", "event");
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: "0",
          senderKeys: [],
          senderFetched: false,
          receiverId: "0",
          receiverKeys: [],
          receiverFetched: false,
          value: "1000",
          convertedValue: "0"
        }, "transfer log");

        [EMPTY_AUDIT, EMPTY_AUDIT, EMPTY_AUDIT].map((audit, i) => {
          let logId = i+1;
          assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
          assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
        });
      });
    });
  });

  describe("and one audit mode (ALWAYS x DIFFERENT_CURRENCY) configured", function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.alwaysDifferentCurrency);
    });

    it("should have the configured audit required", async function () {
      const success = await delegate.assertIsAuditRequired(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        CONFIGURATIONS.alwaysDifferentCurrency[0]);
      assert.ok(success, "success");
    });

    it("should process the configured audit", async function () {
      const tx = await delegate.testUpdateAudit(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        CONFIGURATIONS.alwaysDifferentCurrency[0]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 4);
      assert.equal(tx.logs[0].event, "LogTransferData", "event");
      assertTransferLog(tx.logs[0].args, {
        token: TOKEN_ADDRESS,
        caller: accounts[0],
        sender: accounts[1],
        receiver: accounts[2],
        senderId: "0",
        senderKeys: [],
        senderFetched: false,
        receiverId: "0",
        receiverKeys: [],
        receiverFetched: false,
        value: "1000",
        convertedValue: "1500"
      }, "transfer log");

      const timestamp = await getBlockTime(tx.receipt.blockNumber);
      const senderAudit = {
        createdAt: timestamp,
        lastTransactionAt: timestamp,
        cumulatedEmission: "1500",
        cumulatedReception: "0"
      };
       const receiverAudit = {
        createdAt: timestamp,
        lastTransactionAt: timestamp,
        cumulatedEmission: "0",
        cumulatedReception: "1500"
      };
      [EMPTY_AUDIT, senderAudit, receiverAudit].map((audit, i) => {
        let logId = i+1;
        assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
        assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
      });
    });
  });

  describe("and one audit mode (ALWAYS x CREATED_AT only) configured", function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.alwaysCreatedAt);
    });

    it("should have the configured audit required", async function () {
      const success = await delegate.assertIsAuditRequired(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        CONFIGURATIONS.alwaysCreatedAt[0]);
      assert.ok(success, "success");
    });

    it("should process the configured audit", async function () {
      const tx = await delegate.testUpdateAudit(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        CONFIGURATIONS.alwaysCreatedAt[0]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 4);
      assert.equal(tx.logs[0].event, "LogTransferData", "event");
      assertTransferLog(tx.logs[0].args, {
        token: TOKEN_ADDRESS,
        caller: accounts[0],
        sender: accounts[1],
        receiver: accounts[2],
        senderId: "0",
        senderKeys: [],
        senderFetched: false,
        receiverId: "0",
        receiverKeys: [],
        receiverFetched: false,
        value: "1000",
        convertedValue: "0"
      }, "transfer log");

      const timestamp = await getBlockTime(tx.receipt.blockNumber);
      const senderAudit = {
        createdAt: timestamp,
        lastTransactionAt: "0",
        cumulatedEmission: "0",
        cumulatedReception: "0"
      };
      const receiverAudit = {
        createdAt: timestamp,
        lastTransactionAt: "0",
        cumulatedEmission: "0",
        cumulatedReception: "0"
      };
      [EMPTY_AUDIT, senderAudit, receiverAudit].map((audit, i) => {
        let logId = i+1;
        assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
        assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
      });
    });
  });

  describe("and one audit mode (ALWAYS x LAST_TRANSACTION_AT only) configured", function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.alwaysLastTransactionAt);
    });

    it("should have the configured audit required", async function () {
      const success = await delegate.assertIsAuditRequired(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        CONFIGURATIONS.alwaysLastTransactionAt[0]);
      assert.ok(success, "success");
    });

    it("should process the configured audit", async function () {
      const tx = await delegate.testUpdateAudit(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        CONFIGURATIONS.alwaysLastTransactionAt[0]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 4);
      assert.equal(tx.logs[0].event, "LogTransferData", "event");
      assertTransferLog(tx.logs[0].args, {
        token: TOKEN_ADDRESS,
        caller: accounts[0],
        sender: accounts[1],
        receiver: accounts[2],
        senderId: "0",
        senderKeys: [],
        senderFetched: false,
        receiverId: "0",
        receiverKeys: [],
        receiverFetched: false,
        value: "1000",
        convertedValue: "0"
      }, "transfer log");

      const timestamp = await getBlockTime(tx.receipt.blockNumber);
      const senderAudit = {
        createdAt: "0",
        lastTransactionAt: timestamp,
        cumulatedEmission: "0",
        cumulatedReception: "0"
      };
       const receiverAudit = {
        createdAt: "0",
        lastTransactionAt: timestamp,
        cumulatedEmission: "0",
        cumulatedReception: "0"
      };
      [EMPTY_AUDIT, senderAudit, receiverAudit].map((audit, i) => {
        let logId = i+1;
        assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
        assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
      });
    });
  });

  describe("and one audit mode (ALWAYS x CUMULATED_EMISSION only) configured", function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.alwaysCumulatedEmission);
    });

    it("should have the configured audit required", async function () {
      const success = await delegate.assertIsAuditRequired(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        CONFIGURATIONS.alwaysCumulatedEmission[0]);
      assert.ok(success, "success");
    });

    it("should process the configured audit", async function () {
      const tx = await delegate.testUpdateAudit(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        CONFIGURATIONS.alwaysCumulatedEmission[0]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 4);
      assert.equal(tx.logs[0].event, "LogTransferData", "event");
      assertTransferLog(tx.logs[0].args, {
        token: TOKEN_ADDRESS,
        caller: accounts[0],
        sender: accounts[1],
        receiver: accounts[2],
        senderId: "0",
        senderKeys: [],
        senderFetched: false,
        receiverId: "0",
        receiverKeys: [],
        receiverFetched: false,
        value: "1000",
        convertedValue: "0"
      }, "transfer log");

      const timestamp = await getBlockTime(tx.receipt.blockNumber);
      const senderAudit = {
        createdAt: "0",
        lastTransactionAt: "0",
        cumulatedEmission: "1000",
        cumulatedReception: "0"
      };
      [EMPTY_AUDIT, senderAudit, EMPTY_AUDIT].map((audit, i) => {
        let logId = i+1;
        assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
        assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
      });
    });
  });

  describe("and one audit mode (ALWAYS x CUMULATED_RECEPTION only) configured", function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.alwaysCumulatedReception);
    });

    it("should have the configured audit required", async function () {
      const success = await delegate.assertIsAuditRequired(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        CONFIGURATIONS.alwaysCumulatedReception[0]);
      assert.ok(success, "success");
    });

    it("should process the configured audit", async function () {
      const tx = await delegate.testUpdateAudit(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        CONFIGURATIONS.alwaysCumulatedReception[0]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 4);
      assert.equal(tx.logs[0].event, "LogTransferData", "event");
      assertTransferLog(tx.logs[0].args, {
        token: TOKEN_ADDRESS,
        caller: accounts[0],
        sender: accounts[1],
        receiver: accounts[2],
        senderId: "0",
        senderKeys: [],
        senderFetched: false,
        receiverId: "0",
        receiverKeys: [],
        receiverFetched: false,
        value: "1000",
        convertedValue: "0"
      }, "transfer log");

      const timestamp = await getBlockTime(tx.receipt.blockNumber);
      const receiverAudit = {
        createdAt: "0",
        lastTransactionAt: "0",
        cumulatedEmission: "0",
        cumulatedReception: "1000"
      };
      [EMPTY_AUDIT, EMPTY_AUDIT, receiverAudit].map((audit, i) => {
        let logId = i+1;
        assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
        assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
      });
    });
  });

  describe("and multiple audits configured", function () {
    beforeEach(async function () {
      let configs = Object.values(CONFIGURATIONS);
      for(var i=0; i < configs.length; i++) {
        await delegate.defineAuditConfiguration(...configs[i]);
      }
    });

    it("should have no audits", async function () {
      const tx = await delegate.testUpdateAllAudits(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        []);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "LogTransferData", "event");
      assertTransferLog(tx.logs[0].args, {
        token: TOKEN_ADDRESS,
        caller: accounts[0],
        sender: accounts[1],
        receiver: accounts[2],
        senderId: "0",
        senderKeys: [],
        senderFetched: false,
        receiverId: "0",
        receiverKeys: [],
        receiverFetched: false,
        value: "1000",
        convertedValue: "0"
      }, "All audits");
    });

/*    it("should have all audits", async function () {
      const tx = await delegate.testUpdateAllAudits(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        Object.values(CONFIGURATIONS).map((x, i) => i));
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 66);
      assert.equal(tx.logs[0].event, "LogTransferData", "event");
      assertTransferLog(tx.logs[0].args, {
        token: TOKEN_ADDRESS,
        caller: accounts[0],
        sender: accounts[1],
        receiver: accounts[2],
        senderId: "2",
        senderKeys: [],
        senderFetched: true,
        receiverId: "3",
        receiverKeys: [],
        receiverFetched: true,
        value: "1000",
        convertedValue: "1500"
      }, "All audits");

      const timestamp = await getBlockTime(tx.receipt.blockNumber);
      const sharedAudit = {
        createdAt: timestamp,
        lastTransactionAt: timestamp,
        cumulatedEmission: "1000",
        cumulatedReception: "1000"
      };
      const auditLogs = new Array(66).fill(EMPTY_AUDIT);
      auditLogs.map((audit, i) => {
        let logId = i+1;
        assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
        assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
      });

    });*/
  });
});
