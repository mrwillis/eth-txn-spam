import { JsonRpcProvider } from "@ethersproject/providers";
import { BigNumber, Contract, Wallet } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import Greeter from "../Greeter.json";

const gasLimit = 500_000;

export async function erc20TransferLoop(
    wallet: Wallet,
    contractAddress: string,
    gasPrice?: BigNumber
) {
    const contract = new Contract(contractAddress, Greeter.abi, wallet);
    let nonce = await wallet.getTransactionCount();
    while (true) {
        console.log(`Simulating transfer with account ${wallet.address}, nonce: ${nonce}`);
        await contract.simulateErc20Transfer({
            nonce,
            gasLimit: gasLimit,
            gasPrice: gasPrice || parseUnits("1", "gwei"),
        });
        nonce = nonce + 1;
    }
}
