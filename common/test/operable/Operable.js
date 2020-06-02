"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const OperableAsCoreMock = artifacts.require("OperableAsCoreMock.sol");

contract("OperableAsCore", function (accounts) {
  let contract;

  beforeEach(async function () {
    contract = OperableAsCoreMock.new();
  });
});
