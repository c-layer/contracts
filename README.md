# Compliance Layer SmartContracts

Welcome to the C-Layer Ethereum monorepo.

## Purpose

Provide an administrable layer over the Ethereum blockchain protocol.

One of the foremost use case is the support of regulated asset classes and financial services.

## Content

### C-Layer token

Currently, the C-Layer supports the tokenization of the following assets: Bonds, Equity, Payment and Utility.
All tokens are evolving around the concept of the CToken.

The CToken extends the ERC20 standard with the following features:
  - Operable: provide an owner and ability to delegate restricted features to operators
  - Auditability: track sendings and receiptions
  - Proofs of ownership: store balance history within Ethereum state
  - Rule Engine: ERC-1592 (see below)
  - Claims: provides claims based on token balance or generated proofs of ownership
  - Seize: authorize operators to seize any tokens. Any seizure will emit a Seize events in the Ethereum history.

A CToken supply can be managed in two ways:
  - either through multiple mint operations followed by a finishMinting to prevent further minting
  - through successives issuing and redeeming.

Following [ERC-1592](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1592.md), the token contains a rule engine.
It allows to plug rules which follow the IRule interface implementations.
Available rules are:
  - YesNoRule: accept or refuse all transfers (used for testing)
  - FreezeRule: reject sending and receiving for an address or the token until a specified date,
  - LockRule: lock the token inside or outside a timeframe while allowing some addresses to have either sending or receiving exceptions,
  - KYCRule: lock all addresses which are not contains within a specified user registry.
  - RulesPackage: contains itself a list of sub rules

### C-Layer oracle

Three oracles are provided:
  - UserRegistry: contains a list of users alongs with their respective profiling informations.

  - RatesProvider: contains a list of rates for many pairs. Rates history is available through events search.

  - Tokensale: provides a way to operate a tokensale with happend both in FIAT (centralized) and in ETH (decentralized).
    The tokensale provides also the following features:
      - Contribution limitations based on a user profiles in user registry oracle
      - Automatic conversion from ETHER to FIAT through a rates provider oracle
      - Pre allocations of tokens to specific investors
      - Onchain SPA aggrement (defined as not mandatory)
      - Bonus provided until a certain dates

### C-Layer tool

Contains notably:
  - governance contracts
  - several multisig implementations
  - an erc20 vault

Multisig are provided here to demonstrate different approaches.


