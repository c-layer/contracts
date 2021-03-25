
# A First Sale

### Requirements

Your environment is setup as described [here](./Tutorials.md#requirements).

### Goals

This tutorial will guide you how to setup and operate a token factory.

### Start

##### 1- Go into the distribution module and start truffle

```bash
cd distribution && yarn develop
```

##### 2- Load definitions

You shall to load the definitions needed for this tutorial:

```javascript
accounts = await web3.eth.getAccounts()

TokenERC20 = await artifacts.require('TokenERC20')
BaseTokensale = await artifacts.require('BaseTokensale')
```

### Steps

##### 3- Setup a tokensale

Let's frst create a simple ERC20 token with 100'000 supplies and 0 decimals.

```javascript
supply = 100000
token = await TokenERC20.new('Name', 'Symbol', 0, accounts[1], supply)
```

We will sell half of the token minted at a price of 0.15 Ether per 1000 tokens.
The following command will let you create a basic tokensale.


```javascript
vaultERC20 = accounts[1]
vaultETH = accounts[2]
tokenPrice = web3.utils.toWei('0.15', 'ether')
priceUnit = 1000

sale = await BaseTokensale.new(token.address, vaultERC20, vaultETH, tokenPrice, priceUnit)
```

To allow the sale to distribute half of the tokens, we must increase the allowance.

```javascript
await token.approve(sale.address, supply/2, { from: accounts[1] })
```

Finally, you may want to note the initial amount available in the ETH vault.
```javascript
await web3.eth.getBalance(vaultETH)
```

##### 4- Buy tokens

How many token would you receive, if you were to invest 1 ETH ?
Let's find out with the following command below to query before the real investment.

```javascript
await sale.tokenInvestment(accounts[3], web3.utils.toWei('1', 'ether')).then((value) => value.toString())
```

You can play with different value, if you want to see what happens, particularly on edge cases.
It should match our expectation. Let's really invest now!

```javascript
await sale.investETH({ value: web3.utils.toWei('0.01', 'ether') })
```

As we did the first investment, we may want to check few values:

- The amount of ETH contained in the vault
```javascript
await web3.eth.getBalance(vaultETH)
```

- The amount of ERC20 we have received
```javascript
await token.balanceOf(accounts[0]).then((value) => value.toString())
```

- Statistics on the investor (ETH unspent, ETH invested and token bought)
```javascript
await sale.investorUnspentETH(accounts[0]).then((value) => web3.utils.fromWei(value, 'ether'))
await sale.investorInvested(accounts[0]).then((value) => web3.utils.fromWei(value, 'ether'))
await sale.investorTokens(accounts[0]).then((value) => value.toString())
```

##### 5- Pause the sale

At any time, you may need to pause the sale. This can be done using the pause method.

```javascript
await sale.pause()
```

While the sale paused, it is not possible for investors to buy any tokens.
The following command should raise the exception PA01.
```javascript
await sale.investETH({ value: web3.utils.toWei('0.01', 'ether') })
``` 

Unpausing can be done at any time while paused.
```javascript
await sale.unpause()
```

##### 5- Withdraw funds

ETH received by the tokensale contract should be redirected to the ETH vault address.
However when round up, may be unspent (when rounding up, ETH does not match)

If at some point, as an investor, you want to withdraw your unspent ETH, you can proceed as below.
An exception is raised (TOS04), if there is no ETH unspent for the investor.
```javascript
await sale.refundUnspentETH()
```

You may check that you don't have any unspent anymore

```javascript
await sale.investorUnspentETH(accounts[0]).then((value) => web3.utils.fromWei(value, 'ether'))
```

As an operator, you may need at the end of the sale to recover all unspent ETH. In this case the following command will do it.

```javascript
await sale.withdrawAllETHFunds()
```

