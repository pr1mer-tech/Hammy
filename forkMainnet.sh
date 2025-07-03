#!/bin/zsh

IMPERSONATE_ACCOUNT=0x1ab0Cc8Db72AB7881346626f5a80538966612e15
STABLE_TOKEN=0x9F8CF9c00fac501b3965872f4ed3271f6f4d06fF
RECIPIENT=0xCEFF6c90a9cEF78513b9a6bfA62eC16B81d610EB

anvil --fork-url https://rpc.xrplevm.org --chain-id 1440000 &
# Wait 5 seconds before starting the development server
sleep 5
cast rpc anvil_impersonateAccount $IMPERSONATE_ACCOUNT &
cast send $STABLE_TOKEN \
--from $IMPERSONATE_ACCOUNT \
  "transfer(address,uint256)(bool)" \
  $RECIPIENT \
  1800000 \
  --unlocked &

# Mint 500 ETH to the recipient account
# 500 ETH = 500 * 10^18 wei = 0x1B1AE4D6E2EF500000 in hex
cast rpc anvil_setBalance $RECIPIENT 0x1B1AE4D6E2EF500000 &

docker run --rm -p 5100:80 --name otterscan -e ERIGON_URL="http://localhost:8545" otterscan/otterscan:latest > /dev/null &

NEXT_PUBLIC_LOCALFORK=true bun dev
