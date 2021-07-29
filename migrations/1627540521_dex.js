const DaiContract = artifacts.require('mocks/Dai');
const BatContract = artifacts.require('mocks/Bat');
const RepContract = artifacts.require('mocks/Rep');
const ZrxContract = artifacts.require('mocks/Zrx');
const DexContract = artifacts.require("Dex");

const [DAI, BAT, REP, ZRX] = ['DAI', 'BAT', 'REP', 'ZRX']
  .map(ticker => web3.utils.asciiToHex(ticker));

const SIDE = {
  BUY: 0,
  SELL: 1
};

module.exports = async function (deployer, _network, accounts) {
  await Promise.all(
    [
      DaiContract,
      BatContract,
      RepContract,
      ZrxContract,
      DexContract
    ].map(contract => deployer.deploy(contract))
  );

  const [
    daiDeployed,
    batDeployed,
    repDeployed,
    zrxDeployed,
    dexDeployed
  ] = await Promise.all(
    [
      DaiContract,
      BatContract,
      RepContract,
      ZrxContract,
      DexContract
    ].map(contract => contract.deployed())
  );

  // Add tokens to Dex contract
  await Promise.all([
    dexDeployed.addToken(DAI, daiDeployed.address),
    dexDeployed.addToken(BAT, batDeployed.address),
    dexDeployed.addToken(REP, repDeployed.address),
    dexDeployed.addToken(ZRX, zrxDeployed.address)
  ]);

  const amount = web3.utils.toWei('1000');
  const [trader1, trader2, trader3, trader4] = [
    accounts[0], accounts[1], accounts[2], accounts[3],
  ];
  const traders = [trader1, trader2, trader3, trader4];
  for (const trader of traders) {
    await Promise.all(
      [
        daiDeployed,
        batDeployed,
        repDeployed,
        zrxDeployed,
      ].map(token => seedTokenBalance(token, trader, amount, dexDeployed))
    );
  }

  await createTraders([trader1, trader2], dexDeployed);
  await createLimitOrder(dexDeployed, traders);
};

const seedTokenBalance = async (token, trader, amount, dexContract) => {
  await token.faucet(trader, amount);
  await token.approve(
    dexContract.address,
    amount,
    { from: trader }
  );
  const ticker = await token.symbol();
  await dexContract.deposit(
    amount,
    web3.utils.asciiToHex(ticker),
    { from: trader }
  );
}

const createTraders = async ([trader1, trader2], dexContract) => {
  //create trades
  await dexContract
    .createLimitOrder(BAT, 1000, 10, SIDE.BUY, { from: trader1 });
  await dexContract
    .createMarketOrder(BAT, 1000, SIDE.SELL, { from: trader2 });
  await increaseTime(1);

  await dexContract
    .createLimitOrder(BAT, 1200, 11, SIDE.BUY, { from: trader1 });
  await dexContract
    .createMarketOrder(BAT, 1200, SIDE.SELL, { from: trader2 });
  await increaseTime(1);

  await dexContract
    .createLimitOrder(BAT, 1200, 15, SIDE.BUY, { from: trader1 });
  await dexContract
    .createMarketOrder(BAT, 1200, SIDE.SELL, { from: trader2 });
  await increaseTime(1);

  await dexContract
    .createLimitOrder(BAT, 1500, 14, SIDE.BUY, { from: trader1 });
  await dexContract
    .createMarketOrder(BAT, 1500, SIDE.SELL, { from: trader2 });
  await increaseTime(1);

  await dexContract
    .createLimitOrder(BAT, 2000, 12, SIDE.BUY, { from: trader1 });
  await dexContract
    .createMarketOrder(BAT, 2000, SIDE.SELL, { from: trader2 });
  await dexContract
    .createLimitOrder(REP, 1000, 2, SIDE.BUY, { from: trader1 });
  await dexContract
    .createMarketOrder(REP, 1000, SIDE.SELL, { from: trader2 });
  await increaseTime(1);

  await dexContract
    .createLimitOrder(REP, 500, 4, SIDE.BUY, { from: trader1 });
  await dexContract
    .createMarketOrder(REP, 500, SIDE.SELL, { from: trader2 });
  await increaseTime(1);

  await dexContract
    .createLimitOrder(REP, 800, 2, SIDE.BUY, { from: trader1 });
  await dexContract
    .createMarketOrder(REP, 800, SIDE.SELL, { from: trader2 });
  await increaseTime(1);

  await dexContract
    .createLimitOrder(REP, 1200, 6, SIDE.BUY, { from: trader1 });
  await dexContract
    .createMarketOrder(REP, 1200, SIDE.SELL, { from: trader2 });
}

const increaseTime = async (seconds) => {
  await web3.currentProvider.send({
    jsonrpc: '2.0',
    method: 'evm_increaseTime',
    params: [seconds],
    id: 0,
  }, () => { });
  await web3.currentProvider.send({
    jsonrpc: '2.0',
    method: 'evm_mine',
    params: [],
    id: 0,
  }, () => { });
}

const createLimitOrder = async (
  dexContract,
  [trader1, trader2, trader3, trader4
  ]) => {
  await Promise.all([
    dexContract.createLimitOrder(BAT, 1400, 10, SIDE.BUY, { from: trader1 }),
    dexContract.createLimitOrder(BAT, 1200, 11, SIDE.BUY, { from: trader2 }),
    dexContract.createLimitOrder(BAT, 1000, 12, SIDE.BUY, { from: trader2 }),

    dexContract.createLimitOrder(REP, 3000, 4, SIDE.BUY, { from: trader1 }),
    dexContract.createLimitOrder(REP, 2000, 5, SIDE.BUY, { from: trader1 }),
    dexContract.createLimitOrder(REP, 500, 6, SIDE.BUY, { from: trader2 }),

    dexContract.createLimitOrder(ZRX, 4000, 12, SIDE.BUY, { from: trader1 }),
    dexContract.createLimitOrder(ZRX, 3000, 13, SIDE.BUY, { from: trader1 }),
    dexContract.createLimitOrder(ZRX, 500, 14, SIDE.BUY, { from: trader2 }),

    dexContract.createLimitOrder(BAT, 2000, 16, SIDE.SELL, { from: trader3 }),
    dexContract.createLimitOrder(BAT, 3000, 15, SIDE.SELL, { from: trader4 }),
    dexContract.createLimitOrder(BAT, 500, 14, SIDE.SELL, { from: trader4 }),

    dexContract.createLimitOrder(REP, 4000, 10, SIDE.SELL, { from: trader3 }),
    dexContract.createLimitOrder(REP, 2000, 9, SIDE.SELL, { from: trader3 }),
    dexContract.createLimitOrder(REP, 800, 8, SIDE.SELL, { from: trader4 }),

    dexContract.createLimitOrder(ZRX, 1500, 23, SIDE.SELL, { from: trader3 }),
    dexContract.createLimitOrder(ZRX, 1200, 22, SIDE.SELL, { from: trader3 }),
    dexContract.createLimitOrder(ZRX, 900, 21, SIDE.SELL, { from: trader4 }),
  ]);
}
