import { JsonRpcProvider } from "@ethersproject/providers";
import { BigNumber, Contract, Wallet } from "ethers";
import Greeter from "../Greeter.json";

const gasLimit = BigNumber.from(500_000);

export async function complexTransactionLoop(
  mnemonic: string,
  index: number,
  rpcUrl: string,
  contractAddress: string,
  gasPrice: BigNumber
) {
  const wallet = Wallet.fromMnemonic(
    mnemonic,
    `m/44'/60'/0'/0/${index}`
  ).connect(new JsonRpcProvider(rpcUrl));
  const contract = new Contract(contractAddress, Greeter.abi, wallet);
  let nonce = await wallet.getTransactionCount();
  while (true) {
    console.log(
      `Simulating complex transaction with account ${wallet.address}, nonce: ${nonce}`
    );
    await contract.simulateComplexTransaction({
      nonce,
      gasLimit: gasLimit,
      gasPrice: gasPrice,
    });
    nonce = nonce + 1;
  }
}
