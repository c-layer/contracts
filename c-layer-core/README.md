
# C-Layer Core

Compliance might requires to enforce restrictions on multiple contracts and assets at the same time.
But Ethereum is built around the idea that each contract is independant.
In particular, the ACID (Atomicity, Consistency, Isolation and Durability) properties are only guaranteed per transaction at a contract level.

The goal of the Core is to define a common design pattern for all contracts which might requires this need.
The design pattern work around the following ocmponent:
- Proxies. Provides a unique and specific address for each assets. Compatible with all tools and standard.
- Core. Provides the unified storage. ACID properties of this contract will be used to ensure safety of all operations
- Processors. Provides the code to be run by the core. Processors allow to have more code beyond gas limitations, and upgrade the code.

## Level

### Level 1- Multi Token (Proxy/Core)

### Level 1-bis Multi Token Generation (Proxy Generation)

### Level 2- Multi AssetClass (DelegateCall)

### Level 3- (GenericMemory)

