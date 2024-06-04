const { ethers, providers } = require('ethers');

// Create random wallets for testing purposes
const wallet1 = ethers.Wallet.createRandom();
const wallet2 = ethers.Wallet.createRandom();

console.log('Wallet 1:', wallet1.address, wallet1.privateKey);
console.log('Wallet 2:', wallet2.address, wallet2.privateKey);

const provider = new providers.JsonRpcProvider('https://sepolia.infura.io/v3/51ee7f3b1af945ce82f1d5a90316c30a');

// Define Uniswap V3 Router address (checksummed address)
const routerAddress = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'; // Example router address; replace with actual one if needed

// ABI for the Router's swapExactETHForTokens function
const routerAbi = [
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)"
];

// Address of WETH and DAI on the Sepolia network (checksummed addresses)
const WETH_ADDRESS = '0xD0dF82dE051244f04BfF3A8bB1f62E1cD39eED92'; // Replace with the actual WETH address on Sepolia
const DAI_ADDRESS = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'; // Replace with the actual DAI address on Sepolia

async function bundleSwapTransactions(wallets, swapData) {
  const transactions = [];

  for (const wallet of wallets) {
    const signer = new ethers.Wallet(wallet.privateKey, provider);
    const contract = new ethers.Contract(routerAddress, routerAbi, signer);

    const txData = await contract.populateTransaction.swapExactETHForTokens(...swapData);

    // Add value to the transaction data (amount of ETH to send)
    txData.value = ethers.utils.parseEther('0.005'); // Example ETH amount to swap

    // Set maxFeePerGas and maxPriorityFeePerGas (optional, customize prioritization)
    txData.maxFeePerGas = wallet.maxFeePerGas || ethers.utils.parseUnits('100', 'gwei'); // Base gas price
    txData.maxPriorityFeePerGas = wallet.maxPriorityFeePerGas || ethers.utils.parseUnits('20', 'gwei'); // Priority fee for faster execution (optional)

    transactions.push({
      ...txData,
      value: txData.value.toHexString(),
      maxFeePerGas: txData.maxFeePerGas.toHexString(),
      maxPriorityFeePerGas: txData.maxPriorityFeePerGas.toHexString(),
      gasLimit: ethers.utils.hexlify(250000) // Adding a fixed gas limit for simplicity
    });
  }

  // Sort transactions by maxFeePerGas (higher first)
  transactions.sort((a, b) => ethers.BigNumber.from(b.maxFeePerGas).sub(ethers.BigNumber.from(a.maxFeePerGas)));

  return transactions;
}

async function sendBundledSwap(transactions) {
  for (const txData of transactions) {
    try {
      const tx = await provider.sendTransaction(txData);
      console.log(`Swap transaction submitted for ${txData.from} with txHash: ${tx.hash}`);
    } catch (error) {
      console.error(`Error sending swap transaction for ${txData.from}:`, error);
    }
  }
}

const wallets = [
  { address: wallet1.address, privateKey: wallet1.privateKey },
  { address: wallet2.address, privateKey: wallet2.privateKey, maxFeePerGas: ethers.utils.parseUnits('120', 'gwei') }, // Higher gas price for faster execution
];

const swapData = [
  ethers.utils.parseUnits('0.005', 'ether'), // Amount of ETH to swap
  [WETH_ADDRESS, DAI_ADDRESS], // Path from WETH to DAI
  wallet1.address, // Replace with the address receiving the tokens
  Math.floor(Date.now() / 1000) + 60 * 10 // Deadline
];

(async () => {
  const bundledTx = await bundleSwapTransactions(wallets, swapData);
  await sendBundledSwap(bundledTx);
})();
