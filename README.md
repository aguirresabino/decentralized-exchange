# Decentralized Exchange (DEX)

## Tools

- [Solidity](https://docs.soliditylang.org/en/v0.8.6/)
- [Truffle](https://www.trufflesuite.com/truffle)
- [Chai](https://www.chaijs.com/)
- [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts)
- [OpenZeppelin Test Helpers](https://docs.openzeppelin.com/test-helpers/0.5/)
- [React](https://reactjs.org/)

## Getting Started

### 1. Install dependencies:

```sh
yarn install
```

### 2. Run tests:

```
yarn truffle:test
```
### 3. Deployment to private blockchain:

3.1. Create private blockchain with Truffle: 
```sh
yarn truffle:develop
```

3.2 Import Truffle accounts into your favorite Wallet.

Example with MetaMask wallet: 

https://metamask.zendesk.com/hc/en-us/articles/360015489331-How-to-import-an-Account

3.2. Deploy contract:
```sh
yarn truffle:migrate
```

3.3 Execute front-end:
```sh
yarn client:start
```

## Client screenshot
![image](https://user-images.githubusercontent.com/26256775/127886794-93683156-8686-4cad-b420-80337d44f586.png)
