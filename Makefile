# Setup some project vars
PROJECT:=Payments
ROOT_DIR:=$(CURDIR)
OUTPUT_DIR:=${ROOT_DIR}/out
TESTNET_DIR:=${OUTPUT_DIR}/testnet
TEST_ADDR:=0x003533CD36aC980768B510F5C57E00CE4c0229D5
TEST_KEY:=0x9cbc61f079e82f0d9d3989a99f5cfe4aef68cbec8063b821fd41e994ea131c79 
ALITH_ADDR:=0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac
ALITH_KEY:=0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133

$(shell mkdir -p ${OUTPUT_DIR})

# include .env file and export its env vars
# (-include to ignore error if it does not exist)
-include .env

clean:
	forge clean

project-tree:
	tree -I 'lib|out|node_modules|cache|README*|*.lock|public|package.json|foundry.toml|tsconfig.json'

deps:
	curl -L https://foundry.paradigm.xyz | bash
	foundryup

# https://onbjerg.github.io/foundry-book/forge/dependencies.html
deps-oz:
	forge install openzeppelin/openzeppelin-contracts-upgradeable@v4.5.2
	forge install openzeppelin/openzeppelin-contracts@v4.5.0

# Build & test
build  :; forge build --extra-output metadata
test   :; forge test -vvvv 
flatten :; forge flatten ./src/${PROJECT}.sol
# estimate :; ./scripts/estimate-gas.sh ${contract}
# size   :; ./scripts/contract-size.sh ${contract}
abi-out:
	jq '.abi' ./out/${PROJECT}.sol/${PROJECT}.json > ./out/${PROJECT}Abi.json
	cp -r ./out/${PROJECT}Abi.json ./frontend/src
	jq '.abi' ./out/AminoToken.sol/AminoToken.json > ./out/AminoTokenAbi.json
	cp -r ./out/AminoTokenAbi.json ./frontend/src

testnet:
	docker run --rm -p 9944:9944 -p 9933:9933 --name amino-dev gcr.io/alpha-carbon/amino:v0.8.0 --dev --execution=native --ws-external --rpc-external --sealing 3000 -linfo,pallet_ethereum=trace,evm=trace,pallet_vrf_oracle=error

deploy-testnet: export CHAIN_PARAMS=--rpc-url http://localhost:9933 --private-key ${ALITH_KEY}
deploy-testnet:
	@forge create ${CHAIN_PARAMS} --legacy Payments
	@cast send ${CHAIN_PARAMS} 0xc01ee7f10ea4af4673cfff62710e1d7792aba8f3 "initialize(uint256)" 42 

frontend-dev:
	(cd frontend && yarn start)
