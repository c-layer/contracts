"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertThrow = require("../helpers/assertThrow");
const { assertAuditLog, assertTransferLog, assertTransferDataLog } = require("../helpers/assertLog");
const AuditableDelegateMock = artifacts.require("AuditableDelegateMock.sol");
const UserRegistryMock = artifacts.require("UserRegistryMock.sol");
const RatesProviderMock = artifacts.require("RatesProviderMock.sol");

const SUPPLY = 1000000;
const NAME = "Token";
const SYMBOL = "TKN";
const SYMBOL_BYTES = web3.utils.toHex(SYMBOL).padEnd(42, "0");
const DECIMALS = 18;
const CHF = "CHF";
const CHF_BYTES = web3.utils.toHex(CHF).padEnd(42, "0");
const TOKEN_ADDRESS = "0x" + "123456789".padStart(40, "0");
const NULL_ADDRESS = "0x".padEnd(42, "0");
const EMPTY_BYTES = "0x".padEnd(42, "0");
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
const AUDIT_WHEN_TRIGGERS_MATCHED = 3;

// Audit Storage
const AUDIT_STORAGE_ADDRESS = 0;
const AUDIT_STORAGE_USER_ID = 1;
const AUDIT_STORAGE_SHARED = 2;

// Test Configurations
const CONFIGURATIONS = {
  "never": [
    "0", "0",
    AUDIT_NEVER,
    [], [], NULL_ADDRESS, NULL_ADDRESS
  ],
  "always": [
    "1", "1",
    AUDIT_ALWAYS,
    [], [], NULL_ADDRESS, NULL_ADDRESS
  ],
  "alwaysTriggersExcluded": [
    "2", "2",
    AUDIT_ALWAYS_TRIGGERS_EXCLUDED,
    [], [], NULL_ADDRESS, NULL_ADDRESS
  ],
  "whenTriggersMatched": [
    "3", "3",
    AUDIT_WHEN_TRIGGERS_MATCHED,
    [], [], NULL_ADDRESS, NULL_ADDRESS
  ],
  "alwaysDifferentCurrency": [
    "4", "4",
    AUDIT_ALWAYS,
    [], [], NULL_ADDRESS, CHF_BYTES
  ]
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
       if(config[6] != NULL_ADDRESS) {
         // Setting which rates provider to use
         config[5] = ratesProvider.address;
       }
     });
  });

  describe("and audit mode NEVER is configured", function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.never);
    });

    it("should have no audits required", async function () {
      const tx = await delegate.testPrepareAudit(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        [CONFIGURATIONS.never[0]]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "LogTransferAuditData", "event");
      assertTransferDataLog(tx.logs[0].args, {
        "auditConfigurationId": CONFIGURATIONS.never[0],
        "scopeId": CONFIGURATIONS.never[1],
        "currency": "0x0000000000000000000000000000000000000000",
        "ratesProvider": "0x0000000000000000000000000000000000000000",
        "receiverAuditRequired": false,
        "senderAuditRequired": false
      }, "audit prepared");
    });


    it("should process the configured NEVER audit", async function () {
      const tx = await delegate.testUpdateAllAudits(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        [CONFIGURATIONS.never[0]]);
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

    it("should fail without any audit configured", async function () {
      await assertThrow(delegate.testUpdateAllAudits(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        []));
    });

    it("should process many audits", async function () {
      const tx = await delegate.testUpdateAllAudits(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        [1, 2, 3]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 10);
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

  describe("and one audit mode (ALWAYS x USER_ID) configured", function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.always);
    });

    it("should have the configured audit required", async function () {
      const tx = await delegate.testPrepareAudit(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        [CONFIGURATIONS.always[0]]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "LogTransferAuditData", "event");
      assertTransferDataLog(tx.logs[0].args, {
        "auditConfigurationId": CONFIGURATIONS.always[0],
        "scopeId": CONFIGURATIONS.always[1],
        "currency": "0x0000000000000000000000000000000000000000",
        "ratesProvider": "0x0000000000000000000000000000000000000000",
        "receiverAuditRequired": true,
        "senderAuditRequired": true
      }, "audit prepared");
    });

    it("should process the configured audit", async function () {
      const tx = await delegate.testUpdateAllAudits(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        [CONFIGURATIONS.always[0]]);
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
        convertedValue: "1000"
      }, "transfer log");

      const timestamp = await getBlockTime(tx.receipt.blockNumber);
      const senderAudit = {
        createdAt: timestamp,
        lastTransactionAt: "0",
        cumulatedEmission: "1000",
        cumulatedReception: "0"
      };
      const receiverAudit = {
        createdAt: timestamp,
        lastTransactionAt: "0",
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

  describe("and one audit mode (ALWAYS TRIGGERS EXCLUDED) configured", function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.alwaysTriggersExcluded);
    });

    describe("with no triggers defined", function () {
      it("should have the configured audit required", async function () {
        const tx = await delegate.testPrepareAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          [CONFIGURATIONS.alwaysTriggersExcluded[0]]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, "LogTransferAuditData", "event");
        assertTransferDataLog(tx.logs[0].args, {
          "auditConfigurationId": CONFIGURATIONS.alwaysTriggersExcluded[0],
          "scopeId": CONFIGURATIONS.alwaysTriggersExcluded[1],
          "currency": "0x0000000000000000000000000000000000000000",
          "ratesProvider": "0x0000000000000000000000000000000000000000",
          "receiverAuditRequired": true,
          "senderAuditRequired": true
        }, "audit prepared");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAllAudits(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          [CONFIGURATIONS.alwaysTriggersExcluded[0]]);
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
          convertedValue: "1000"
        }, "transfer log");

        const timestamp = await getBlockTime(tx.receipt.blockNumber);
        const senderAudit = {
          createdAt: timestamp,
          lastTransactionAt: "0",
          cumulatedEmission: "1000",
          cumulatedReception: "0"
        };
        const receiverAudit = {
          createdAt: timestamp,
          lastTransactionAt: "0",
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

    describe("with token defined as a trigger", function () {
      beforeEach(async function () {
        await delegate.defineAuditTriggers(CONFIGURATIONS.alwaysTriggersExcluded[0],
          [TOKEN_ADDRESS], [true], [false], [false]);
      });

      it("should have the configured audit required", async function () {
        const tx = await delegate.testPrepareAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          [CONFIGURATIONS.alwaysTriggersExcluded[0]]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, "LogTransferAuditData", "event");
        assertTransferDataLog(tx.logs[0].args, {
          "auditConfigurationId": CONFIGURATIONS.alwaysTriggersExcluded[0],
          "scopeId": CONFIGURATIONS.alwaysTriggersExcluded[1],
          "currency": "0x0000000000000000000000000000000000000000",
          "ratesProvider": "0x0000000000000000000000000000000000000000",
          "receiverAuditRequired": true,
          "senderAuditRequired": true
        }, "audit prepared");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAllAudits(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          [CONFIGURATIONS.alwaysTriggersExcluded[0]]);
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
          convertedValue: "1000"
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
        const tx = await delegate.testPrepareAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          [CONFIGURATIONS.alwaysTriggersExcluded[0]]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, "LogTransferAuditData", "event");
        assertTransferDataLog(tx.logs[0].args, {
          "auditConfigurationId": CONFIGURATIONS.alwaysTriggersExcluded[0],
          "scopeId": CONFIGURATIONS.alwaysTriggersExcluded[1],
          "currency": "0x0000000000000000000000000000000000000000",
          "ratesProvider": "0x0000000000000000000000000000000000000000",
          "senderAuditRequired": false,
          "receiverAuditRequired": true
        }, "audit prepared");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAllAudits(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          [CONFIGURATIONS.alwaysTriggersExcluded[0]]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 5);
        assert.equal(tx.logs[0].event, "LogTransferData", "event");
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: "0",
          senderKeys: [],
          senderFetched: false,
          receiverId: "3",
          receiverKeys: [],
          receiverFetched: true,
          value: "1000",
          convertedValue: "1000"
        }, "transfer log");

        const timestamp = await getBlockTime(tx.receipt.blockNumber);
        const receiverAudit = {
          createdAt: timestamp,
          lastTransactionAt: "0",
          cumulatedEmission: "0",
          cumulatedReception: "1000"
        };
        [EMPTY_AUDIT, EMPTY_AUDIT, EMPTY_AUDIT, receiverAudit].map((audit, i) => {
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
        const tx = await delegate.testPrepareAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          [CONFIGURATIONS.alwaysTriggersExcluded[0]]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, "LogTransferAuditData", "event");
        assertTransferDataLog(tx.logs[0].args, {
          "auditConfigurationId": CONFIGURATIONS.alwaysTriggersExcluded[0],
          "scopeId": CONFIGURATIONS.alwaysTriggersExcluded[1],
          "currency": "0x0000000000000000000000000000000000000000",
          "ratesProvider": "0x0000000000000000000000000000000000000000",
          "senderAuditRequired": true,
          "receiverAuditRequired": false
        }, "audit prepared");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAllAudits(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          [CONFIGURATIONS.alwaysTriggersExcluded[0]]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 5);
        assert.equal(tx.logs[0].event, "LogTransferData", "event");
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: "2",
          senderKeys: [],
          senderFetched: true,
          receiverId: "0",
          receiverKeys: [],
          receiverFetched: false,
          value: "1000",
          convertedValue: "1000"
        }, "transfer log");

        const timestamp = await getBlockTime(tx.receipt.blockNumber);
        const senderAudit = {
          createdAt: timestamp,
          lastTransactionAt: "0",
          cumulatedEmission: "1000",
          cumulatedReception: "0"
        };
        [EMPTY_AUDIT, EMPTY_AUDIT, EMPTY_AUDIT, senderAudit].map((audit, i) => {
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
        const tx = await delegate.testPrepareAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          [CONFIGURATIONS.whenTriggersMatched[0]]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, "LogTransferAuditData", "event");
        assertTransferDataLog(tx.logs[0].args, {
          "auditConfigurationId": CONFIGURATIONS.whenTriggersMatched[0],
          "scopeId": CONFIGURATIONS.whenTriggersMatched[1],
          "currency": "0x0000000000000000000000000000000000000000",
          "ratesProvider": "0x0000000000000000000000000000000000000000",
          "senderAuditRequired": false,
          "receiverAuditRequired": false
        }, "audit prepared");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAllAudits(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          [CONFIGURATIONS.whenTriggersMatched[0]]);
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
        const tx = await delegate.testPrepareAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          [CONFIGURATIONS.whenTriggersMatched[0]]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, "LogTransferAuditData", "event");
        assertTransferDataLog(tx.logs[0].args, {
          "auditConfigurationId": CONFIGURATIONS.whenTriggersMatched[0],
          "scopeId": CONFIGURATIONS.whenTriggersMatched[1],
          "currency": "0x0000000000000000000000000000000000000000",
          "ratesProvider": "0x0000000000000000000000000000000000000000",
          "senderAuditRequired": false,
          "receiverAuditRequired": false
        }, "audit prepared");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAllAudits(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          [CONFIGURATIONS.whenTriggersMatched[0]]);
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
          cumulatedEmission: "0",
          cumulatedReception: "0"
        };
        const receiverAudit = {
          createdAt: "0",
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

    describe("with sender defined as a trigger", function () {
      beforeEach(async function () {
         await delegate.defineAuditTriggers(CONFIGURATIONS.whenTriggersMatched[0],
          [accounts[1]], [false], [true], [false]);
      });

      it("should have the configured audit required", async function () {
        const tx = await delegate.testPrepareAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          [CONFIGURATIONS.whenTriggersMatched[0]]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, "LogTransferAuditData", "event");
        assertTransferDataLog(tx.logs[0].args, {
          "auditConfigurationId": CONFIGURATIONS.whenTriggersMatched[0],
          "scopeId": CONFIGURATIONS.whenTriggersMatched[1],
          "currency": "0x0000000000000000000000000000000000000000",
          "ratesProvider": "0x0000000000000000000000000000000000000000",
          "senderAuditRequired": false,
          "receiverAuditRequired": true
        }, "audit prepared");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAllAudits(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          [CONFIGURATIONS.whenTriggersMatched[0]]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 5);
        assert.equal(tx.logs[0].event, "LogTransferData", "event");
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: "0",
          senderKeys: [],
          senderFetched: false,
          receiverId: "3",
          receiverKeys: [],
          receiverFetched: true,
          value: "1000",
          convertedValue: "1000"
        }, "transfer log");

        const timestamp = await getBlockTime(tx.receipt.blockNumber);
        const senderAudit = {
          createdAt: "0",
          lastTransactionAt: "0",
          cumulatedEmission: "0",
          cumulatedReception: "0"
        };
         const receiverAudit = {
          createdAt: timestamp,
          lastTransactionAt: "0",
          cumulatedEmission: "0",
          cumulatedReception: "1000"
        };
        [EMPTY_AUDIT, EMPTY_AUDIT, senderAudit, receiverAudit].map((audit, i) => {
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
        const tx = await delegate.testPrepareAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          [CONFIGURATIONS.whenTriggersMatched[0]]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, "LogTransferAuditData", "event");
        assertTransferDataLog(tx.logs[0].args, {
          "auditConfigurationId": CONFIGURATIONS.whenTriggersMatched[0],
          "scopeId": CONFIGURATIONS.whenTriggersMatched[1],
          "currency": "0x0000000000000000000000000000000000000000",
          "ratesProvider": "0x0000000000000000000000000000000000000000",
          "senderAuditRequired": true,
          "receiverAuditRequired": false
        }, "audit prepared");
      });

      it("should process the configured audit", async function () {
        const tx = await delegate.testUpdateAllAudits(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
          [CONFIGURATIONS.whenTriggersMatched[0]]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 5);
        assert.equal(tx.logs[0].event, "LogTransferData", "event");
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: "2",
          senderKeys: [],
          senderFetched: true,
          receiverId: "0",
          receiverKeys: [],
          receiverFetched: false,
          value: "1000",
          convertedValue: "1000"
        }, "transfer log");

        const timestamp = await getBlockTime(tx.receipt.blockNumber);
        const senderAudit = {
          createdAt: timestamp,
          lastTransactionAt: "0",
          cumulatedEmission: "1000",
          cumulatedReception: "0"
        };
         const receiverAudit = {
          createdAt: "0",
          lastTransactionAt: "0",
          cumulatedEmission: "0",
          cumulatedReception: "0"
        };
        [EMPTY_AUDIT, EMPTY_AUDIT, EMPTY_AUDIT, senderAudit].map((audit, i) => {
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
      const tx = await delegate.testPrepareAudit(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        [CONFIGURATIONS.alwaysDifferentCurrency[0]]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "LogTransferAuditData", "event");
      assertTransferDataLog(tx.logs[0].args, {
          "auditConfigurationId": CONFIGURATIONS.alwaysDifferentCurrency[0],
          "scopeId": CONFIGURATIONS.alwaysDifferentCurrency[1],
          "currency": CONFIGURATIONS.alwaysDifferentCurrency[6],
          "ratesProvider": CONFIGURATIONS.alwaysDifferentCurrency[5],
          "senderAuditRequired": true,
          "receiverAuditRequired": true
      }, "audit prepared");
    });

    it("should process the configured audit", async function () {
      const tx = await delegate.testUpdateAllAudits(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], "1000",
        [CONFIGURATIONS.alwaysDifferentCurrency[0]]);
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
        convertedValue: "1500"
      }, "transfer log");

      const timestamp = await getBlockTime(tx.receipt.blockNumber);
      const senderAudit = {
        createdAt: timestamp,
        lastTransactionAt: "0",
        cumulatedEmission: "1500",
        cumulatedReception: "0"
      };
       const receiverAudit = {
        createdAt: timestamp,
        lastTransactionAt: "0",
        cumulatedEmission: "0",
        cumulatedReception: "1500"
      };
      [EMPTY_AUDIT, EMPTY_AUDIT, EMPTY_AUDIT, senderAudit, receiverAudit].map((audit, i) => {
        let logId = i+1;
        assert.equal(tx.logs[logId].event, "LogAuditData", "event ["+logId+"]");
        assertAuditLog(tx.logs[logId].args, audit, "audit ["+logId+"]");
      });
    });
  });
});
