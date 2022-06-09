import { BigNumber, Wallet } from "ethers";
import { formatEther, parseUnits } from "ethers/lib/utils";

const sendAmount = parseUnits("0.001", 18);
const gasLimit = 100_000;

export async function basicTransferLoop(
    wallet: Wallet,
    recipient: Wallet,
    gasPrice?: BigNumber
) {
    let nonce = await wallet.getTransactionCount();
    while (true) {        
        console.log(`Sending ${formatEther(sendAmount)} to ${recipient.address} from ${wallet.address}`);
        const txn = await wallet.sendTransaction({
            value: sendAmount,
            to: recipient.address,
            gasLimit: gasLimit,
            gasPrice: gasPrice || parseUnits("1", "gwei"),
            nonce,
        });
        console.log(`Done sending ${formatEther(sendAmount)} to ${recipient.address} from ${wallet.address}. Hash: ${txn.hash}`);
        nonce = nonce + 1;
    }
}
