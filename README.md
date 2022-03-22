# Payments Contract Template for AminoX

## Dependencies

- Docker
- Nodejs
- Yarn
- Curl

## Project Structure

```tree
├── Makefile                        ; All Scripts and Pipelines
├── frontend                        ; React Web3 Sample
│   └── src
│       ├── AminoTokenAbi.json      ; ERC20 + EIP2612 Contract ABI
│       ├── App.tsx                 ; All Frontend Interaction Logic
│       ├── PaymentsAbi.json        ; Payments Contract ABI
│       ├── initOnboard.ts          ; Web3 Connector
├── lib                             ; Third party solidity dependencies
├── remappings.txt                  ; Solidity library path remappings
├── scripts                         ; Tooling
└── src                             ; Smart Contracts
    ├── AminoToken.sol              ; AminoX Compatible Token in Solidity
    ├── Payments.sol                ; Payments Template Smart Contract
    └── test
        └── Payments.t.sol          ; Smart Contract HEVM Unit Tests
```

## Getting Started


### Development

Development should occur in "./src" and "./src/test".  

```sh
# Download dependencies
make deps

# Build the Smart Contracts
make build

# Run the HEVM Unit Tests
make test

# Export the ABI's "./out" and "/frontend/src"
make abi-out
```

### Local Deployment

```sh
# starts a local aminox testnet (requires docker)
make testnet

# deploy Payments.sol to Local testnet
make deploy-testnet

# start frontend
make frontend-dev 
```
