import { Wallet, ContractFactory, BigNumber } from "ethers";
import { JsonRpcProvider } from "@ethersproject/providers";
import { parseUnits, formatEther, parseEther } from "ethers/lib/utils";
import Greeter from "./Greeter.json";
import fs from "fs";
import { join as pathJoin } from "path";
import { exec as execProcess } from "child_process";
import util from "util";

export interface IMainWalletActions {
    address(): string
    initialContractDeploy(gasPrice: BigNumber): Promise<string>;
    distributeNativeCurrencyIfNecessary(gasPrice: BigNumber): Promise<boolean>;
    getBalances(): Promise<[Wallet, BigNumber][]>;
}

export function makeWallets(privateKeyMainWallet: string, rpcUrl: string, mnemonic: string, range: number)
    : IMainWalletActions {
    if (privateKeyMainWallet.startsWith("0x")) {
        privateKeyMainWallet = privateKeyMainWallet.substring(2)
    }
    const provider = new JsonRpcProvider(rpcUrl);    
    const sendingWallet = new Wallet(privateKeyMainWallet).connect(provider);
    const wallets: Wallet[] = Array.from(Array(range).keys()).map(index => {
        const recipient = Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${index}`).connect(provider);
        return recipient;
    });            
    let nonce = -1;
    
    return {
        address() { return sendingWallet.address; },

        initialContractDeploy: async function (gasPrice: BigNumber): Promise<string> {
            if (nonce == -1) {
                nonce = await sendingWallet.getTransactionCount();
            }

            console.log(`Deploying Initial Greeter contract with account ${sendingWallet.address}, nonce: ${nonce}`);
            const gasLimit = BigNumber.from(500_000);
            const factory = new ContractFactory(Greeter.abi, Greeter.bytecode, sendingWallet);                        
            const contract = await factory.deploy({
                nonce,
                gasLimit: gasLimit,
                gasPrice: gasPrice, // parseUnits("1", "gwei")
            });

            nonce++;
            return contract.address
        },
        
        distributeNativeCurrencyIfNecessary: async function (gasPrice: BigNumber): Promise<boolean> {
            if (nonce == -1) {
                nonce = await sendingWallet.getTransactionCount();
            }
            
            const gasLimit = BigNumber.from(100_000);                
            const minimumBalance = parseEther("10");
            
            const sendTxIfNeeded = async function (recipient: Wallet, amount: BigNumber): Promise<boolean> {
                try {
                    await sendingWallet.sendTransaction({
                        value: amount,
                        to: recipient.address,
                        gasLimit: gasLimit,
                        gasPrice: gasPrice, // parseUnits("10", "gwei"),
                        nonce,
                    })
                    nonce++;
                    console.log(`Recipient ${recipient.address} receiving ${formatEther(amount)}`);
                    return true;
                } catch (err) {
                    console.log(`Recipient ${recipient.address} error: ${err}`);
                    return false;
                }                
            }

            const sendingWalletBalance = await provider.getBalance(sendingWallet.address);
            console.log(`Sending wallet address: ${sendingWallet.address}, balance: ${formatEther(sendingWalletBalance)}`);
            
            const balances = await this.getBalances();
            let distributionAmount = sendingWalletBalance.div(range);
            if (distributionAmount.gt(minimumBalance)) {
                distributionAmount = minimumBalance;
            }
            
            const promiseCalls: Promise<boolean>[] = balances
                .filter(([_, balance]) => balance.lt(minimumBalance)) // only send matics to wallets with less than minimumBalance balance 
                .map(([wallet, _]) => sendTxIfNeeded(wallet, distributionAmount));
            const results = await Promise.all(promiseCalls);
            return results.some(x => x);
        },

        getBalances: async function (): Promise<[Wallet, BigNumber][]> {
            const promiseCalls: Promise<BigNumber>[] = wallets.map(recipient => {
                return recipient.getBalance();
            });
            const balances = await Promise.all(promiseCalls);
            return balances.map((balance, index) => [wallets[index], balance]);
        },
    }
}

type ConfigData = {
    privateKey: string;
    spamContractAddress: string;
    rpcUrl: string;
};

export const Config = {
    data: {} as ConfigData,
    load: function() {
        const buffer = fs.readFileSync('./src/config.json');
        const js = JSON.parse(buffer.toString());
        this.data = js as ConfigData;
    },
    save: function() {
        const data = JSON.stringify(this.data)
        fs.writeFileSync('./src/config.json', data);
    },
    init: function(pk: string, address: string, rpcUrl: string) {
        this.data = { privateKey: pk, spamContractAddress: address, rpcUrl: rpcUrl };
        return this;
    },
    setAddress: function(address: string) {
        this.data.spamContractAddress = address;
        return this;
    },
    setRpcUrl: function(rpcUrl: string) {
        this.data.rpcUrl = rpcUrl;
        return this;
    }
}

export const executeInRange = async function(intRange: number, fn: (arg0: number) => Promise<void>) {
    await Promise.all(
        Array.from(Array(intRange).keys()).map(async (index) => {
            try {
                await fn(index);
            } catch (err) {
                console.log(`Error for account ${index}: ${err}`);
            }
        })
    );
}
  
export const sleep = function(time: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, time));
}

export const startcmd = async function(cmd: string): Promise<[boolean, string, string]> {
    const exec = util.promisify(execProcess); // i.e. can then await for promisified exec call to complete    
    try {
        const { stdout, stderr } = await exec(cmd);
        return [true, stdout, stderr];
    } catch {
        return [false, "", ""];
    }
}

export const resolveHome = function (filepath: string): string {
    if (!filepath || filepath[0] !== '~') {
        return filepath
    }
    return pathJoin(process.env.HOME!, filepath.slice(1));
}

export const getGasPrice = function(rpcUrl: string): Promise<BigNumber> {
    const provider = new JsonRpcProvider(rpcUrl)
    return provider.getGasPrice()
}