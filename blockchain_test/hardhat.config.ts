import { defineConfig } from 'hardhat/config';

export default defineConfig({
  solidity: '0.8.24',
  networks: {
    hardhat: {
      type: 'edr-simulated' as const,
      chainId: 31337,
    },
    localhost: {
      type: 'http' as const,
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    baseSepolia: {
      type: 'http' as const,
      url: process.env.RPC_URL || 'https://sepolia.base.org',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532,
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
});
