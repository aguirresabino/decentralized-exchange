import Web3 from 'web3';
import Dex from './abis/Dex.json';
import ERC20 from './abis/ERC20.json';

const getWeb3 = async () => {
    return new Promise(async (resolve, reject) => {
        window.addEventListener('load', async () => {
            if (window.ethereum) {
                const web3 = new Web3(window.ethereum);
                try {
                    await window.ethereum.enable();
                    resolve(web3);
                } catch (error) {
                    reject(error);
                }
            } else if (window.web3) {
                resolve(window.web3);
            } else {
                reject('Must install Metamask Wallet!');
            }
        });
    });
};

const getContracts = async (web3) => {
    const networkId = await web3.eth.net.getId();
    const deployedNetwork = Dex.networks[networkId];
    const dex = new web3.eth.Contract(
        Dex.abi,
        deployedNetwork && deployedNetwork.address,
    );
    const tokens = await dex.methods.getTokens().call();
    const tokenContracts = tokens.reduce((acc, token) => ({
        ...acc,
        [web3.utils.hexToUtf8(token.ticker)]: new web3.eth.Contract(
            ERC20.abi,
            token.tokenAddress
        )
    }), {});
    return { dex, ...tokenContracts };
}

export { getWeb3, getContracts };