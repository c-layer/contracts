
/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

module.exports = {
  assertAuditLog: function (log, expected, message) {
    assert.deepEqual({
      createdAt: log.createdAt.toString(),
      lastTransactionAt: log.lastTransactionAt.toString(),
      cumulatedEmission: log.cumulatedEmission.toString(),
      cumulatedReception: log.cumulatedReception.toString(),
    }, expected, message);
  },
  assertTransferLog: function (log, expected, message) {
    assert.deepEqual({
      token: log.token.toString(),
      caller: log.caller.toString(),
      sender: log.sender.toString(),
      receiver: log.receiver.toString(),
      senderId: log.senderId.toString(),
      senderKeys: log.senderKeys.map((x) => x.toString()),
      senderFetched: log.senderFetched,
      receiverId: log.receiverId.toString(),
      receiverKeys: log.receiverKeys.map((x) => x.toString()),
      receiverFetched: log.receiverFetched,
      value: log.value.toString(),
      convertedValue: log.convertedValue.toString(),
    }, expected, message);
  }
};
