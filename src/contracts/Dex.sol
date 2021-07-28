// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';

contract Dex {
    
    using SafeMath for uint;

    bytes32 constant DAI = bytes32("DAI");
    bytes32[] public tokenList;
    address public admin;
    uint public nextOrderId;
    uint public nextTradeId;

   enum Side {
        BUY,
        SELL
    }

    struct Token {
        bytes32 ticker;
        address tokenAddress;
    }

    // Order Limit:
    //  - Buy <= LIMIT
    // - Sell >= LIMIT
    struct Order {
        uint id;
        address trader;
        Side side;
        bytes32 ticker; // eh a identificacao do token, por exemplo: DAI, BTC, ETH
        uint amount;
        uint filled;
        uint price;
        uint date;
    }

    mapping(bytes32 => Token) public tokens;
    mapping(address => mapping(bytes32 => uint)) public traderBalances;
    // o uint será o Side. No Solidity podemos converter o enum para inteiro desta forma:
    // uint(Side.SELL)
    // uint(Side.BUY)
    mapping(bytes32 => mapping(uint => Order[])) public orderBook;

    // indexed: like PostgresSQL or MongoDB index?
    event NewTrade(
        uint tradeId,
        uint orderId,
        bytes32 indexed ticker,
        address indexed trader1,
        address indexed trader2,
        uint amount,
        uint price,
        uint date
    );

    constructor() {
        admin = msg.sender;
    }

    function getOrders(
        bytes32 ticker, 
        Side side
    ) external view returns (Order[] memory) {
       return orderBook[ticker][uint(side)];
    }

    function getTokens() external view returns (Token[] memory) {
        Token[] memory _tokens = new Token[](tokenList.length);
        for (uint i = 0; i < tokenList.length; i++) {
            _tokens[i] = Token(
                tokens[tokenList[i]].ticker,
                tokens[tokenList[i]].tokenAddress
            );
        }
        return _tokens;
    }

    function addToken(
        bytes32 ticker, 
        address tokenAddress
    ) external onlyAdmin() {
        tokens[ticker] = Token(ticker, tokenAddress);
        tokenList.push(ticker);
    }

    function deposit(
        uint amount, 
        bytes32 ticker
    ) external tokenExist(ticker) {
        // address(this): address contract instance
        // o amount está sendo enviado para o contrato, dessa forma o contrato pode fazer empréstimos e etc
        IERC20(tokens[ticker].tokenAddress).transferFrom(
            msg.sender,
            address(this),
            amount
        );
        traderBalances[msg.sender][ticker] = traderBalances[msg.sender][ticker].add(amount);
    }

    function withdraw(
        uint amount, 
        bytes32 ticker
    ) external tokenExist(ticker) {
        // ticker representa a moeda, tipo DAI, ETH, BTC
        // aqui está sendo verificado se o usuário que tá executando a movimentação para retirada do dinheiro (withdraw)
        // possui na moeda escolhida (o ticker) um total que é maior ou igual ao valor que ele deseja retirar da conta
        require(
            traderBalances[msg.sender][ticker] >= amount,
            "balance too low"
        );
        traderBalances[msg.sender][ticker] = traderBalances[msg.sender][ticker].sub(amount);
        IERC20(tokens[ticker].tokenAddress).transfer(msg.sender, amount);
    }

    function createLimitOrder(
        bytes32 ticker,
        uint amount,
        uint price,
        Side side
    ) external tokenExist(ticker) tokenIsNotDai(ticker) {
        if (side == Side.SELL) {
            // aqui é verificado se o usuário (msg.sender) possui na moeda escolhida (ticker)
            // o montante que ele deseja vender
            require(
                traderBalances[msg.sender][ticker] >= amount,
                "token balance too low"
            );
        } else {
            // em caso de compra, é verificado se o contrato (address(this)) possui o montante
            // que o usuário deseja comprar
            require(
                traderBalances[msg.sender][DAI] >= amount.mul(price),
                "DAI balance too low"
            );
        }
        Order[] storage orders = orderBook[ticker][uint(side)];
        orders.push(
            Order(
                nextOrderId,
                msg.sender,
                side,
                ticker,
                amount,
                0,
                price,
                block.timestamp
            )
        );
        //TODO: Refactor this method! Use best practices!
        uint i = orders.length > 0 ? orders.length - 1 : 0;
        while (i > 0) {
            if (side == Side.BUY && orders[i - 1].price > orders[i].price) {
                break;
            }
            if (side == Side.SELL && orders[i - 1].price > orders[i].price) {
                break;
            }
            Order memory order = orders[i - 1];
            orders[i - 1] = orders[i];
            orders[i] = order;
            i--;
        }
        nextOrderId++;
    }

    function createMarketOrder(
        bytes32 ticker,
        uint amount,
        Side side
    ) external tokenExist(ticker) tokenIsNotDai(ticker) {
        if (side == Side.SELL) {
            require(
                traderBalances[msg.sender][ticker] >= amount,
                "token balance too low"
            );
        }

        Order[] storage orders = orderBook[ticker][
            uint(side == Side.BUY ? Side.SELL : Side.BUY)
        ];
        uint i;
        uint remaining = amount;
        while (i < orders.length && remaining > 0) {
            uint available = orders[i].amount.sub(orders[i].filled);
            uint matched = (remaining > available) ? available : remaining;
            remaining = remaining.sub(matched);
             orders[i].filled = orders[i].filled.add(matched);
            emit NewTrade(
                nextTradeId,
                orders[i].id,
                ticker,
                orders[i].trader,
                msg.sender,
                matched,
                orders[i].price,
                block.timestamp
            );
            if (side == Side.SELL) {
                traderBalances[msg.sender][ticker] = traderBalances[msg.sender][ticker].sub(matched);
                traderBalances[msg.sender][DAI] = traderBalances[msg.sender][DAI].add(matched.mul(orders[i].price));
                traderBalances[orders[i].trader][ticker] = traderBalances[orders[i].trader][ticker].add(matched);
                traderBalances[orders[i].trader][DAI] = traderBalances[orders[i].trader][DAI].sub(matched.mul(orders[i].price));
            }
            if (side == Side.BUY) {
                require(
                    traderBalances[msg.sender][DAI] >= matched.mul(orders[i].price),
                    'dai balance too low'
                );
                traderBalances[msg.sender][ticker] = traderBalances[msg.sender][ticker].add(matched);
                traderBalances[msg.sender][DAI] = traderBalances[msg.sender][DAI].sub(matched.mul(orders[i].price));
                traderBalances[orders[i].trader][ticker] = traderBalances[orders[i].trader][ticker].sub(matched);
                traderBalances[orders[i].trader][DAI] = traderBalances[orders[i].trader][DAI].add(matched.mul(orders[i].price));
            }
            nextTradeId++;
            i++;
        }

        i = 0;
        while (i < orders.length && orders[i].filled == orders[i].amount) {
            for (uint j = i; j < orders.length - 1; j++) {
                orders[j] = orders[j + 1];
            }
            orders.pop();
            i++;
        }
    }

    modifier tokenIsNotDai(bytes32 ticker) {
        require(ticker != DAI, "cannot trade DAI");
        _;
    }

    modifier tokenExist(bytes32 ticker) {
        // address(0) ou 0x00 é o valor padrão para inicializar uma variável do tipo address
        require(
            tokens[ticker].tokenAddress != address(0),
            "this token does not exist"
        );
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin");
        _;
    }
}
