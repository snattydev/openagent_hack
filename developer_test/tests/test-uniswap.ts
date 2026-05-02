import { UniswapService } from '../../src/services/uniswapService.js';
import { SAFETY_CONFIG, CONTRACT_ADDRESSES, NETWORK_CONFIG } from '../../src/config/constants.js';

async function main() {
  console.log('=== UniswapService Smoke Test ===');

  const service = new UniswapService({ mock: true });

  const amount = '1000000000000000000';
  const quote = await service.getQuote('WETH', 'USDC', amount);

  if (!quote) {
    console.error('FAIL: Quote is null');
    process.exit(1);
  }

  console.log('Quote received:', JSON.stringify(quote, null, 2));

  if (quote.from_token !== NETWORK_CONFIG.WETH_ADDRESS) {
    console.error(`FAIL: from_token mismatch. Expected ${NETWORK_CONFIG.WETH_ADDRESS}, got ${quote.from_token}`);
    process.exit(1);
  }

  if (quote.to_token !== NETWORK_CONFIG.USDC_ADDRESS) {
    console.error(`FAIL: to_token mismatch. Expected ${NETWORK_CONFIG.USDC_ADDRESS}, got ${quote.to_token}`);
    process.exit(1);
  }

  if (quote.amount !== amount) {
    console.error(`FAIL: amount mismatch. Expected ${amount}, got ${quote.amount}`);
    process.exit(1);
  }

  // 1 WETH * $2000 = 2000 USDC (6 decimals)
  const expectedOutput = String(2000 * 1_000_000);
  if (quote.expected_output !== expectedOutput) {
    console.error(`FAIL: expected_output mismatch. Expected ${expectedOutput}, got ${quote.expected_output}`);
    process.exit(1);
  }

  if (quote.slippage !== SAFETY_CONFIG.MAX_SLIPPAGE) {
    console.error(`FAIL: slippage mismatch. Expected ${SAFETY_CONFIG.MAX_SLIPPAGE}, got ${quote.slippage}`);
    process.exit(1);
  }

  if (!quote.route_data?.mock || quote.route_data.price !== 2000) {
    console.error(`FAIL: route_data mismatch. Expected { mock: true, price: 2000 }, got ${JSON.stringify(quote.route_data)}`);
    process.exit(1);
  }

  console.log('✓ All TradeOrder fields verified');

  const calldata = await service.getSwapCalldata(quote);

  if (!calldata) {
    console.error('FAIL: Calldata is null');
    process.exit(1);
  }

  if (calldata.to !== CONTRACT_ADDRESSES.SWAP_ROUTER_02) {
    console.error(`FAIL: calldata.to mismatch. Expected ${CONTRACT_ADDRESSES.SWAP_ROUTER_02}, got ${calldata.to}`);
    process.exit(1);
  }

  if (calldata.data !== '0xc04...') {
    console.error(`FAIL: calldata.data mismatch. Expected 0xc04..., got ${calldata.data}`);
    process.exit(1);
  }

  if (calldata.value !== '0') {
    console.error(`FAIL: calldata.value mismatch. Expected 0, got ${calldata.value}`);
    process.exit(1);
  }

  console.log('Calldata received:', JSON.stringify(calldata, null, 2));
  console.log('✓ All calldata fields verified');

  console.log('\n=== All smoke tests passed ===');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
