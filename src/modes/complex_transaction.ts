import { BigNumber, Contract, Wallet } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import Greeter from "../Greeter.json";

const gasLimit = 500_000;

export async function complexTransactionLoop(
    wallet: Wallet,
    contractAddress: string,
    gasPrice?: BigNumber
) {
    const contract = new Contract(contractAddress, Greeter.abi, wallet);
    let nonce = await wallet.getTransactionCount();
    while (true) {
        console.log(`Simulating complex transaction with account ${wallet.address}, nonce: ${nonce}`);
        await contract.simulateComplexTransaction({
            nonce,
            gasLimit: gasLimit,
            gasPrice: gasPrice || parseUnits("1", "gwei"),
        });
        nonce = nonce + 1;
    }
}
