import { JsonRpcProvider } from "@ethersproject/providers";
import { BigNumber, ContractFactory, Wallet } from "ethers";
import Greeter from "../Greeter.json";

const gasLimit = BigNumber.from(500_000);

export async function contractDeployLoop(
  mnemonic: string,
  index: number,
  rpcUrl: string,
  gasPrice: BigNumber
) {
  const wallet = Wallet.fromMnemonic(
    mnemonic,
    `m/44'/60'/0'/0/${index}`
  ).connect(new JsonRpcProvider(rpcUrl));
  const factory = new ContractFactory(Greeter.abi, Greeter.bytecode, wallet);
  let nonce = await wallet.getTransactionCount();
  while (true) {
    console.log(
      `Deploying Greeter contract with account ${wallet.address}, nonce: ${nonce}`
    );
    await factory.deploy({
      nonce,
      gasLimit: gasLimit,
      gasPrice: gasPrice,
    });
    nonce = nonce + 1;
  }
}
