#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

function generateTokensPage() {
  // Read the token-list.json file
  const tokenListPath = path.join(__dirname, '../public/token-list.json');
  const tokenList = JSON.parse(fs.readFileSync(tokenListPath, 'utf8'));
  
  // Generate the tokens.mdx content
  const tokensContent = `# Tokens supported

| Name           | Symbol         | Address                                      |
|----------------|----------------|----------------------------------------------|
${tokenList.tokens.map(token => 
  `| ${token.name.padEnd(14)} | ${token.symbol.padEnd(14)} | ${token.address} |`
).join('\n')}

`;

  // Write the tokens.mdx file
  const tokensPath = path.join(__dirname, '../docs/pages/tokens.mdx');
  fs.writeFileSync(tokensPath, tokensContent);
  console.log('✅ Generated tokens.mdx');
}

function generateContractsPage() {
  // Get contract addresses from environment variables
  const contracts = [
    {
      name: 'Uniswap V2 Factory',
      address: process.env.NEXT_PUBLIC_UNISWAP_V2_FACTORY || ''
    },
    {
      name: 'Uniswap V2 Router',
      address: process.env.NEXT_PUBLIC_UNISWAP_V2_ROUTER || ''
    },
    {
      name: 'WETH (Wrapped ETH)',
      address: process.env.NEXT_PUBLIC_WETH_ADDRESS || ''
    }
  ];

  // Generate the contracts.mdx content
  const contractsContent = `# Smart contracts

| Name                   | Address                                      |
|------------------------|----------------------------------------------|
${contracts.map(contract => 
  `| ${contract.name.padEnd(22)} | ${contract.address} |`
).join('\n')}

`;

  // Write the contracts.mdx file
  const contractsPath = path.join(__dirname, '../docs/pages/contracts.mdx');
  fs.writeFileSync(contractsPath, contractsContent);
  console.log('✅ Generated contracts.mdx');
}

function main() {
  console.log('🚀 Generating documentation pages...');
  
  try {
    generateTokensPage();
    generateContractsPage();
    console.log('✨ Documentation generation complete!');
  } catch (error) {
    console.error('❌ Error generating documentation:', error.message);
    process.exit(1);
  }
}

main(); 