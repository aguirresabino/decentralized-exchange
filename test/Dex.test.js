const { expectRevert } = require('@openzeppelin/test-helpers');
const { assert } = require('chai');

const Bat = artifacts.require('mocks/Bat');
const Dai = artifacts.require('mocks/Dai');
const Rep = artifacts.require('mocks/Rep');
const Zrx = artifacts.require('mocks/Zrx');
const Dex = artifacts.require('Dex');

const SIDE = {
    BUY: 0,
    SELL: 1,
};

const seedTokenBalance = async (token, trader, dexContract) => {
    const amount = web3.utils.toWei('1000');
    await token.faucet(trader, amount);
    await token.approve(
        dexContract.address,
        amount,
        { from: trader },
    );
};

contract('Dex', (accounts) => {
    let bat = null;
    let dai = null;
    let rep = null;
    let zrx = null;
    let dex = null;
    const [trader1, trader2] = [accounts[1], accounts[2]];

    const [BAT, DAI, REP, ZRX] = ['BAT', 'DAI', 'REP', 'ZRX']
        .map(ticker => web3.utils.asciiToHex(ticker));

    beforeEach(async () => {
        [bat, dai, rep, zrx, dex] = await Promise.all(
            [
                Bat.new(), // token
                Dai.new(), // token
                Rep.new(), // token
                Zrx.new(), // token
                Dex.new() // dapp decentralized exchange
            ]
        );
        // // add tokens to DEX
        await Promise.all([
            dex.addToken(BAT, bat.address),
            dex.addToken(DAI, dai.address),
            dex.addToken(REP, rep.address),
            dex.addToken(ZRX, zrx.address),
        ]);
        // // allocate initial token balances
        for (const trader of [trader1, trader2]) {
            await Promise.all(
                [dai, bat, rep, zrx]
                    .map(token => seedTokenBalance(token, trader, dex))
            );
        }
    });

    it('should deposit tokens', async () => {
        const amount = web3.utils.toWei('100');

        await dex.deposit(
            amount,
            DAI,
            { from: trader1 }
        );

        const balanceDaiInDex = await dex.traderBalances(trader1, DAI);
        assert.equal(balanceDaiInDex.toString(), amount);
        const balanceDai = await dai.balanceOf(trader1);
        // do montante inicial de DAI do trader1 (1000) foram removidos 100, logo
        // ele passa a ter 900 DAI
        const expectedBalanceDai = web3.utils.toWei('900');
        assert.equal(balanceDai.toString(), expectedBalanceDai);
    });

    it('should NOT deposit if token does not exist', async () => {
        await expectRevert(
            dex.deposit(
                web3.utils.toWei('100'),
                web3.utils.asciiToHex('TOKEN_DOES_NOT_EXIST'),
                { from: trader1 }
            ),
            'this token does not exist'
        );
    });

    it('should withdraw tokens', async () => {
        const amount = web3.utils.toWei('100');
        await dex.deposit(
            amount,
            DAI,
            { from: trader1 }
        );
        await dex.withdraw(
            amount,
            DAI,
            { from: trader1 }
        );
        const balanceDaiInDex = await dex.traderBalances(trader1, DAI);
        const expectedBalanceDaiInDex = web3.utils.toWei('0');
        assert.equal(balanceDaiInDex.toString(), expectedBalanceDaiInDex);
        const balanceDai = await dai.balanceOf(trader1);
        const expectedBalanceDai = web3.utils.toWei('1000');
        assert.equal(balanceDai.toString(), expectedBalanceDai);
    });

    it('should NOT withdraw if token does not exist', async () => {
        await expectRevert(
            dex.withdraw(
                web3.utils.toWei('100'),
                web3.utils.asciiToHex('TOKEN_DOES_NOT_EXIST'),
                { from: trader1 }
            ),
            'this token does not exist'
        );
    });

    it('should NOT withdraw tokens if balance is zero', async () => {
        await expectRevert(
            dex.withdraw(
                web3.utils.toWei('100'),
                DAI,
                { from: trader1 }
            ),
            'balance too low'
        );
    });

    it('should NOT withdraw tokens if balance too low', async () => {
        const amountToDeposit = web3.utils.toWei('100');
        const amountToWithdraw = web3.utils.toWei('200');
        await dex.deposit(
            amountToDeposit,
            DAI,
            { from: trader1 }
        );
        await expectRevert(
            dex.withdraw(
                amountToWithdraw,
                DAI,
                { from: trader1 }
            ),
            'balance too low'
        );
    });

    it('should create limit order', async () => {
        await dex.deposit(
            web3.utils.toWei('100'),
            DAI,
            { from: trader1 }
        );
        await dex.createLimitOrder(
            REP,
            web3.utils.toWei('10'),
            10,
            SIDE.BUY,
            { from: trader1 }
        );

        let buyOrders = await dex.getOrders(REP, SIDE.BUY);
        let sellOrders = await dex.getOrders(REP, SIDE.SELL);

        assert.lengthOf(buyOrders, 1);
        assert.lengthOf(sellOrders, 0);
        assert.equal(buyOrders[0].trader, trader1);
        assert.equal(buyOrders[0].ticker, web3.utils.padRight(REP, 64));
        assert.equal(buyOrders[0].amount, web3.utils.toWei('10'));
        assert.equal(buyOrders[0].price, '10');

        await dex.deposit(
            web3.utils.toWei('200'),
            DAI,
            { from: trader2 }
        );
        await dex.createLimitOrder(
            REP,
            web3.utils.toWei('10'),
            11,
            SIDE.BUY,
            { from: trader2 }
        );

        buyOrders = await dex.getOrders(REP, SIDE.BUY);
        sellOrders = await dex.getOrders(REP, SIDE.SELL);
        assert.lengthOf(buyOrders, 2);
        assert.lengthOf(sellOrders, 0);
        assert.equal(buyOrders[0].trader, trader2);
        assert.equal(buyOrders[1].trader, trader1);

        await dex.deposit(
            web3.utils.toWei('200'),
            DAI,
            { from: trader2 }
        );
        await dex.createLimitOrder(
            REP,
            web3.utils.toWei('10'),
            9,
            SIDE.BUY,
            { from: trader2 }
        );

        buyOrders = await dex.getOrders(REP, SIDE.BUY);
        sellOrders = await dex.getOrders(REP, SIDE.SELL);
        assert.lengthOf(buyOrders, 3);
        assert.lengthOf(sellOrders, 0);
        assert.equal(buyOrders[0].trader, trader2);
        assert.equal(buyOrders[1].trader, trader1);
        assert.equal(buyOrders[2].trader, trader2);
    });

    it('should NOT create limit order if token balance too low', async () => {
        await dex.deposit(
            web3.utils.toWei('99'),
            REP,
            { from: trader1 }
        );
        await expectRevert(
            dex.createLimitOrder(
                REP,
                web3.utils.toWei('100'),
                10,
                SIDE.SELL,
                { from: trader1 }
            ),
            'token balance too low'
        )
    });

    it('should NOT create limit order if DAI balance too low', async () => {
        await dex.deposit(
            web3.utils.toWei('99'),
            DAI,
            { from: trader1 }
        );
        await expectRevert(
            dex.createLimitOrder(
                REP,
                web3.utils.toWei('10'),
                10,
                SIDE.BUY,
                { from: trader1 }
            ),
            'DAI balance too low'
        );
    });

    it('should NOT create limit order if token is DAI', async () => {
        await expectRevert(
            dex.createLimitOrder(
                DAI,
                web3.utils.toWei('10'),
                10,
                SIDE.BUY,
                { from: trader1 }
            ),
            'cannot trade DAI'
        );
    });

    it('should NOT create limit order if token does not not exist', async () => {
        await expectRevert(
            dex.createLimitOrder(
                web3.utils.asciiToHex('TOKEN_DOES_NOT_EXIST'),
                web3.utils.toWei('10'),
                10,
                SIDE.BUY,
                { from: trader1 }
            ),
            'this token does not exist'
        );
    });

    it('should create market order & match', async () => {
        await dex.deposit(
            web3.utils.toWei('100'),
            DAI,
            { from: trader1 }
        );
        await dex.createLimitOrder(
            REP,
            web3.utils.toWei('10'), // trader1 deseja comprar 10 REP por 10 DAI cada
            10, // trader1 está oferecendo 10 DAI para cada REP
            SIDE.BUY,
            { from: trader1 }
        );

        await dex.deposit(
            web3.utils.toWei('100'),
            REP,
            { from: trader2 }
        );
        await dex.createMarketOrder(
            REP,
            web3.utils.toWei('5'), // trader2 deseja vender 5 REP e irá pegar a oferta de compra mais alta. Neste caso será do trader1, que está oferecendo 10 DAI para cada REP
            SIDE.SELL,
            { from: trader2 }
        );

        const trader1BalancesDai = await dex.traderBalances(trader1, DAI);
        assert.equal(trader1BalancesDai.toString(), web3.utils.toWei('50'));

        const trader1BalancesRep = await dex.traderBalances(trader1, REP);
        assert.equal(trader1BalancesRep.toString(), web3.utils.toWei('5'));

        const trader2BalancesDai = await dex.traderBalances(trader2, DAI);
        assert.equal(trader2BalancesDai.toString(), web3.utils.toWei('50'));

        const trader2BalancesRep = await dex.traderBalances(trader2, REP);
        assert.equal(trader2BalancesRep.toString(), web3.utils.toWei('95'));
    });

    it('should NOT create market order if token balance too low', async () => {
        await expectRevert(
            dex.createMarketOrder(
                REP,
                web3.utils.toWei('101'),
                SIDE.SELL,
                { from: trader2 }
            ),
            'token balance too low'
        );
    });

    it('should NOT create market order if DAI balance too low', async () => {
        await dex.deposit(
            web3.utils.toWei('100'),
            REP,
            { from: trader1 }
        );
        await dex.createLimitOrder(
            REP,
            web3.utils.toWei('100'),
            10,
            SIDE.SELL,
            { from: trader1 }
        );

        await expectRevert(
            dex.createMarketOrder(
                REP,
                web3.utils.toWei('101'), // o trader2 inicia sua carteira com 1000 DAI. Ao tentar comprar 101 REP pelo preço de 10 DAI cada, ele não conseguirá pois o valor total em DAI necessário para a compra é 1010.
                SIDE.BUY,
                { from: trader2 }
            ),
            'dai balance too low'
        );
    });

    it('should NOT create market order if token is DAI', async () => {
        await expectRevert(
            dex.createMarketOrder(
                DAI,
                web3.utils.toWei('1000'),
                SIDE.BUY,
                { from: trader1 }
            ),
            'cannot trade DAI'
        );
    });

    it('should NOT create market order if token does not not exist', async () => {
        await expectRevert(
            dex.createMarketOrder(
                web3.utils.fromAscii('TOKEN_DOES_NOT_EXIST'),
                web3.utils.toWei('1000'),
                SIDE.BUY,
                { from: trader1 }
            ),
            'this token does not exist'
        );
    });
});