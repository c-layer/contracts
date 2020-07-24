
# Adding Bonuses and schedule to the Token Sale

### Requirements

Your environment is setup as described [here](./Tutorials.md#requirements).

### Goals

This tutorial will guide you how to plan and operate a bonus token sale.

### Start

You must start `truffle` from the token module
```bash
  cd distribution && truffle develop
```

Once `truffle` is started, you may need to compile contracts as follow.
```bash
  compile
```


### Steps

##### 1- Setup a tokensale

Let's frst create a simple ERC20 token.

```javascript
   supply = 100000
   token = await TokenERC20.new('Name', 'Symbol', 0, accounts[1], supply)
```

We will sell half of the token minted at a price of 0.15 Ether per 1000 tokens.
The sale will initially happen all day tomorrow.
The bonus will given be as follow:
- For the first 10% sold, we will give +50% more tokens.
- For the first half sold, investors will receive +25%
- And no bonus will be given for the remaining of the tokens

The following command will let you create a basic tokensale.


```javascript
   vaultERC20 = accounts[1]
   vaultETH = accounts[2]
   tokenPrice = web3.utils.toWei('0.15', 'ether')
   priceUnit = 1000

   sale = await BonusTokensale.new(token.address, vaultERC20, vaultETH, tokenPrice, priceUnit)
```

To allow the sale to distribute half of the tokens, we must increase the allowance.

```javascript
   await token.approve(sale.address, supply/2, { from: accounts[1] })
```

Finally, you may want to note the initial amount available in the ETH vault.
```javascript
   await web3.eth.getBalance(vaultETH)
```

##### 2- Giving extra

We shall now define the bonuses as follow.
BonusMode may be either 0 (None), 1 (Early) or 2 (First).
In our scenario, we want the first investors to receive bonuses.

```javascript
   await sale.defineBonuses(2, [50, 25, 0], [ 5000, 25000, 50000 ])
```

To review this parameters, you may check as follow the bonus that will be available at different stage of the sale.

Once 4'000 tokens will be sold, there will still be the following bonus 
```javascript
   await sale.firstBonus(4000).then((bonus) => bonus.remainingAtBonus+" tokens still at +"+bonus.bonus+"% bonus")
```

Once 20'000 tokens will be sold, there will still be the following bonus
```javascript
   await sale.firstBonus(20000).then((bonus) => bonus.remainingAtBonus+" tokens still at +"+bonus.bonus+"% bonus")
```

##### 3- We love it when a plan comes together

We also need to schedule the plan. This is how to do it.

```javascript
   DAY_IN_SEC = 24*3600
   TOMORROW = Math.ceil(new Date().getTime()/(1000*DAY_IN_SEC))
   ONE_DAY_AFTER = TOMORROW+1

   await sale.updateSchedule(TOMORROW*DAY_IN_SEC, ONE_DAY_AFTER*DAY_IN_SEC)
```

You may review it as follow

```javascript
   await sale.schedule().then((values) => Object.values(values).map((v) => new Date(v * 1000)))
```

##### 4- Buy tokens

The sale is currently close. You therefore have two options now.
You may either call the day and retry tomorrow, or speed things up by updating once again the planning.

Let's start it now!
```javascript
   NOW = Math.floor(new Date().getTime()/1000)
   await sale.updateSchedule(NOW, ONE_DAY_AFTER*DAY_IN_SEC)
```

So how many token would you receive, if you were to invest 1 ETH ?
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
   await sale.investorUnspentETH(accounts[0]).then((value) => value.toString())
   await sale.investorInvested(accounts[0]).then((value) => value.toString())
   await sale.investorTokens(accounts[0]).then((value) => value.toString())
```

You can try to invest some more ethers until you do consume all the +50% bonus.

```javascript
   await sale.investETH({ value: web3.utils.toWei('1', 'ether') })
```

You can review and count how many tokens you have received and how many the next investor will get

```javascript
   totalSold = await sale.totalTokensSold()
   await sale.firstBonus(totalSold).then((bonus) => bonus.remainingAtBonus+" tokens still at +"+bonus.bonus+"% bonus")
```

##### 5- Closing early

You may need to close the sale early.
In this case all you have to do is to execute the following command

```javascript
   await sale.closeEarly()
```

You can check that the sale was closed as follow.

```javascript
   await sale.isClosed()
```

##### 6- Experimenting

As an exercise, it suggested to the reader to plan a sale that will use the early bonus.

For example the following bonus could be defined
- For the first hour, we will give +50% more tokens.
- The morning, investors will receive +25%
- And no bonus will be given for the remaining of the day

