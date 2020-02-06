# HOW TO - Deployment of the C-Layer

## Oracles

### User Registry

The User Registry maintains users identity on chain and associate users with some meta data.

```javascript
const name = "MyUserRegistry";
const chf = web3.utils.fromAscii("CHF").padEnd(66, "0");
const initialUsers = [ "0xB100fFed52b40BC9cf0d96386e287E2Af8C9B38A" ];
const initialValidity = (new Date("2025-01-01").getTime()/1000).toFixed(0);

let userRegistry = await UserRegistry.new(
  name, chf, initialUsers, initialUsers, initialValidity);
```

Registration of a new user may be done as follow

```javascript
const validity = (new Date("2025-01-01").getTime()/1000).toFixed(0);
const kycLevel = 1; // correspond to a basic KYC
const amlLimit = "500000"; // correspond to 5'000.00 CHF

await userRegistry.registerUserFull("0xB100fFed52b40BC9cf0d96386e287E2Af8C9B38A", validity, [kycLevel, amlLimit]);
```

Updating a user may be done as follow

```javascript
const userId = 1;
const validity = (new Date("2025-01-01").getTime()/1000).toFixed(0);
const suspended = false;
const kycLevel = 1; // correspond to a basic KYC
const amlLimit = "500000"; // correspond to 5'000.00 CHF

await userRegistry.updateUserFull(1, validity, suspended, [kycLevel, amlLimit]);
```

### Rates Provider

The Rates Provider provide offchain rates.
It can be used directly to convert a amount from a currency into a different one

We will create a Token (TKN) later but we can already set its initial countervalue here.
```javascript
let ratesProvider = await RatesProvider.new("Altcoinomy");
const currencies = [
  web3.utils.fromAscii("ETH").padEnd(66, "0"),
  web3.utils.fromAscii("USD").padEnd(66, "0"),
  web3.utils.fromAscii("CHF").padEnd(66, "0"),
  web3.utils.fromAscii("TKN").padEnd(66, "0")
];
const decimals = [ "18", "2", "2", "18" ];
const ratesOffset = 1;
await ratesProvider.defineCurrencies(currencies, decimals, ratesOffset);

const ETHUSD = 175.20;
const ETHCHF = 180.04;
const ETHTKN = 100;

// The rates is then converted to preserve precisions
const ETH_decimals = decimals[0];
const convert = (x) => Number(10**ETH_decimals / x * ratesOffset).toFixed(0);
const rates = [ ETHUSD, ETHCHF, ETHTKN ].map((x) => convert(x));

await ratesProvider.defineRates(rates);
```

## Deployment and execution of a token

```javascript
let delegates = await Promise.all([
  MintableTokenDelegate.new(),
  TokenDelegate.new(),
]);

const coreName = "MyComplianceCore";
let core = await TokenCore.new(coreName, delegates);
await core.defineOracles(u.address, r.address, [0, 1]);

let token = await TokenProxy.new(core.address);
const delegateId = 1;
await core.defineToken(token.address, delegateId, "Token", "TKN", "18");

const DECIMALS18 = "000000000000000000";
const erc20Vault = [
  "0xB100fFed52b40BC9cf0d96386e287E2Af8C9B38A",
  "0xF9043F5d2ad07755495649cd8ffccBAE5dE01820" ];
const tokenSupplies = [ "1000000000" + DECIMALS18, "1000000000" + DECIMALS18 ];
await core.mintAtOnce(token.address, erc20Vault, tokenSupplies);

const lockStart = (new Date().getTime()/1000).toFixed(0);
const lockEnd = (new Date("2020-08-08").getTime()/1000).toFixed(0);
const exceptions = [ await core.defineLock(token.address, lockStart, lockEnd, erc20Vault);
await core.defineAuditSelector(core.address, 0, erc20Vault[0], [ true ]);

let token = await TokenProxy.new(core.address);
t1 = await Tokensale.new("0xF9043F5d2ad07755495649cd8ffccBAE5dE01820", accounts[0], accounts[0], "77", "100000000000000000000", "0x5553440000000000000000000000000000000000000000000000000000000000", "0x51C0f8B3d5EB7ed7F2F6a400cb5C59BB4DA0E9bd", "0x62C0749F1cF0A9E68B789386aD905544162F18c6", "1571560200", "1571563800");
t2 = await Tokensale.new("0xF9043F5d2ad07755495649cd8ffccBAE5dE01820", accounts[0], accounts[0], "77", "100000000000000000000", "0x5553440000000000000000000000000000000000000000000000000000000000", "0x51C0f8B3d5EB7ed7F2F6a400cb5C59BB4DA0E9bd", "0x62C0749F1cF0A9E68B789386aD905544162F18c6", "1571567400", "1571571000");
t = await IERC20.at("0xF9043F5d2ad07755495649cd8ffccBAE5dE01820");
t.approve(t1.address, "9680000000000000000000000000");
t.approve(t2.address, "8800000000000000000000000000");
```

## Deployment and execution of a tokensale

```javascript
const ethVault = "0xB100fFed52b40BC9cf0d96386e287E2Af8C9B38A";
const tokenPrice = 1; // price within currency decimals (ie cents/wei/satoshi/...)
const priceUnit = 10; // number of tokens given for the price
const priceCurrency = web3.utils.fromAscii("USD").padEnd(66, "0");
const startAt = (new Date("2020-01-01").getTime()/1000).toFixed(0);
const endAt = (new Date(i"2020-01-02").getTime()/1000).toFixed(0);;
let tokensale = await Tokensale.new(token.address,
  ethVault, erc20Vault[0], tokenPrice, priceUnit, priceCurrency, userRegistry.address, ratesProvider.address, startAt, endAt);
await token.approve(tokensale.address, tokenSupplies[0]);
```
