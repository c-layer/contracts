pragma solidity ^0.8.0;

/**
 * @title Migrations
 * @dev Migrations
 *
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract Migrations {
  address public owner;
  uint public lastCompletedMigration;

  constructor() {
    owner = msg.sender;
  }

  modifier restricted() {
    if (msg.sender == owner) _;
  }

  function setCompleted(uint completed) public restricted {
    lastCompletedMigration = completed;
  }

  function upgrade(address newAddress) public restricted {
    Migrations upgraded = Migrations(newAddress);
    upgraded.setCompleted(lastCompletedMigration);
  }
}
