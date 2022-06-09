import { BigNumber, ContractFactory, Wallet } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import Greeter from "../Greeter.json";

const gasLimit = 500_000;

export async function contractDeployLoop(
    wallet: Wallet,
    gasPrice?: BigNumber
) {
    const factory = new ContractFactory(Greeter.abi, Greeter.bytecode, wallet);
    let nonce = await wallet.getTransactionCount();
    while (true) {
        console.log(`Deploying Greeter contract with account ${wallet.address}, nonce: ${nonce}`);
        await factory.deploy({
            nonce,
            gasLimit: gasLimit,
            gasPrice: gasPrice || parseUnits("1", "gwei"),
        });
        nonce = nonce + 1;
    }
}
