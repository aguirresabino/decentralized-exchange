import { useState, useEffect } from 'react';
import { getContracts, getWeb3 } from './utils.js';
import { App } from './App.js';

const LoadingContainer = () => {
    const [web3, setWeb3] = useState(undefined);
    const [accounts, setAccounts] = useState([]);
    const [contracts, setContracts] = useState(undefined);

    useEffect(() => {
        const init = async () => {
            const web3 = await getWeb3();
            const contracts = await getContracts(web3);
            const accounts = await web3.eth.getAccounts();
            setWeb3(web3);
            setContracts(contracts);
            setAccounts(accounts);
        }
        init();
    }, []);

    if(web3 && contracts && accounts.length) {
        return <div>Loading...</div>;
    }

    return (
        <App
          web3={web3}
          accounts={accounts}
          contracts={contracts}
        />
    );
}

export { LoadingContainer };