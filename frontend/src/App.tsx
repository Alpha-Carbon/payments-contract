import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useConnectWallet, useSetChain, useWallets } from '@web3-onboard/react'
import { ethers, providers, BigNumber, utils } from 'ethers'
import { useInterval } from 'usehooks-ts'

import { chains } from './initOnboard'
import Abi from './PaymentsAbi.json'
import AminoTokenAbi from './AminoTokenAbi.json'

import type { ConnectOptions, WalletState } from '@web3-onboard/core'

// #NOTE this is expected to be the localhost dev chain on ALITH's first contract
const PAYMENTS_CONTRACT_ADDRESS = '0xc01ee7f10ea4af4673cfff62710e1d7792aba8f3'
const USDT_CONTRACT_ADDRESS = '0xFFfffffF8d2EE523a2206206994597c13D831EC7'

interface Context {
    wallet: WalletState
    paymentsContract: ethers.Contract
    paymentsContractSigner: ethers.Contract
    USDTContract: ethers.Contract
    provider: providers.JsonRpcProvider
    walletProvider: providers.Web3Provider
}

interface Hooks {
    onBlock: (block: any) => Promise<void>
    onTokenReceived: (
        from: string,
        token: string,
        value: BigNumber
    ) => Promise<void>
    setUSDTBalance: (balance: BigNumber) => void
}

function initDApp(wallet: WalletState, hooks: Hooks): Context {
    let walletProvider = new ethers.providers.Web3Provider(wallet.provider)

    const matches = chains.filter((c: any) =>
        wallet.chains.some((oc) => c.id === oc.id)
    )
    let defaultUrl = matches.length > 0 ? matches[0].rpcUrl : null
    if (!defaultUrl) {
        throw new Error('invalid chainId')
    }

    // create a custom provider for adjustable pollingInterval(can't find a way to configure
    // the metamask default provider's poll rate)
    let provider: providers.JsonRpcProvider = new providers.JsonRpcProvider(
        defaultUrl
    )
    provider.pollingInterval = 2800

    let paymentsContract = new ethers.Contract(
        PAYMENTS_CONTRACT_ADDRESS,
        Abi,
        provider
    )
    let paymentsContractSigner = new ethers.Contract(
        PAYMENTS_CONTRACT_ADDRESS,
        Abi,
        walletProvider.getSigner()
    )
    let USDTContract = new ethers.Contract(
        USDT_CONTRACT_ADDRESS,
        AminoTokenAbi,
        walletProvider.getSigner()
        // provider
    )

    //subscribe some stuff
    provider.on('block', hooks.onBlock)
    paymentsContract.on('tokensReceived', hooks.onTokenReceived)

    return {
        wallet,
        paymentsContract,
        paymentsContractSigner,
        USDTContract,
        provider,
        walletProvider,
    }
}

function unsubscribe(context: Context) {
    context.provider.removeAllListeners()
    context.paymentsContract.removeAllListeners()
}

interface Props {
    className?: string
}
function App({ className }: Props) {
    const [context, setContext] = useState<Context | undefined>()
    const [{ wallet, connecting }, connect, disconnect] = useConnectWallet()
    const [{ chains, connectedChain, settingChain }, setChain] = useSetChain()
    const connectedWallets = useWallets()

    // component states
    const [block, setBlock] = useState<BigNumber>()
    const [tokenBalance, setTokenBalance] = useState<BigNumber>()
    const [contractTokenBalance, setContractTokenBalance] =
        useState<BigNumber>()
    const [paymentsAllowance, setPaymentsAllowance] = useState<BigNumber>()

    useEffect(() => {
        const [currentPrimary] = connectedWallets
        //detect wallet changes
        if (currentPrimary && currentPrimary !== context?.wallet) {
            context && unsubscribe(context)
            let newContext = initDApp(currentPrimary, {
                onBlock: async (b) => {
                    setBlock(b)
                    // console.log(`new block: ${block}`)
                },
                onTokenReceived: async (from, token, value) => {
                    let kind = token
                    switch (token) {
                        case USDT_CONTRACT_ADDRESS:
                            kind = 'USDT'
                            break
                    }
                    toast(
                        `${value} Tokens(${kind}) received by contract from: ${from}`
                    )
                },
                setUSDTBalance: setTokenBalance,
            })
            setContext(newContext)
        }
    }, [connectedWallets, context])

    //get the current wallet
    const selectedAccount = wallet
        ? wallet.accounts?.length > 0
            ? wallet.accounts[0]
            : null
        : null

    //Query for State
    //#TODO there should be a good way to hook into the onBlock listener
    useInterval(
        () => {
            if (!context) return
            context.USDTContract.balanceOf(selectedAccount?.address).then(
                setTokenBalance
            )
            context.USDTContract.balanceOf(PAYMENTS_CONTRACT_ADDRESS).then(
                setContractTokenBalance
            )
            context.USDTContract.allowance(
                selectedAccount?.address,
                PAYMENTS_CONTRACT_ADDRESS
            ).then(setPaymentsAllowance)
        },
        context ? 3000 : null
    )

    return (
        <div className={className}>
            <ToastContainer position="top-center" />
            <img src="logo.svg" className="logo" alt="" />

            <div className="content">
                <div className="title">Payments Contract</div>

                {!wallet ? (
                    <button onClick={() => connect({} as ConnectOptions)}>
                        {connecting ? 'Connecting' : 'Connect'}
                    </button>
                ) : (
                    <div>
                        <button onClick={() => disconnect(wallet)}>
                            Disconnect
                        </button>
                        <p>Block: {block?.toString()}</p>
                        <p>My USDT BALANCE: {tokenBalance?.toString()}</p>
                        <p>
                            PaymentsContract USDT BALANCE:{' '}
                            {contractTokenBalance?.toString()}
                        </p>
                        <p>
                            PaymentsContract USDT ALLOWANCE:{' '}
                            {paymentsAllowance?.toString()}
                        </p>
                    </div>
                )}

                {connectedWallets.map(({ label, accounts }) => {
                    return (
                        <div key={label}>
                            <div>{label}</div>
                            <div>
                                Accounts: {JSON.stringify(accounts, null, 2)}
                            </div>
                        </div>
                    )
                })}

                {wallet && (
                    <div>
                        <label>Switch Chain</label>
                        {settingChain ? (
                            <span>Switching chain...</span>
                        ) : (
                            <select
                                onChange={({ target: { value } }) => {
                                    console.log('onChange called')
                                    setChain({ chainId: value })
                                }}
                                value={connectedChain!.id}
                            >
                                {chains.map(({ id, label }) => {
                                    return (
                                        <option key={label} value={id}>
                                            {label}
                                        </option>
                                    )
                                })}
                            </select>
                        )}
                        <button
                            onClick={() => {
                                context &&
                                    play(
                                        BigNumber.from(1000000000),
                                        BigNumber.from(5000000000),
                                        context,
                                        wallet!,
                                        selectedAccount?.address
                                    )
                            }}
                        >
                            PayAndPermit
                        </button>
                        <button
                            onClick={async () => {
                                context!.paymentsContractSigner.pay(
                                    USDT_CONTRACT_ADDRESS,
                                    BigNumber.from(1000000000),
                                    { gasLimit: 150000 }
                                )
                            }}
                        >
                            Pay
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

async function play(
    bnValue: BigNumber,
    bnAllowance: BigNumber,
    context: Context,
    wallet: WalletState,
    address?: string
) {
    if (!context || !address) return

    let name = await context.USDTContract.name()
    let verifyingContract = context.USDTContract.address.toLowerCase()

    let value = bnValue.toString()
    let allowance = bnAllowance.toString()
    let nonce = (await context.USDTContract.nonces(address)).toString()
    let deadline = BigNumber.from(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
    ).toString()
    console.log(name, nonce.toString())
    console.log(wallet)

    let domain = {
        name,
        version: '1',
        chainId: 88888,
        verifyingContract,
    }
    let permit = {
        owner: address,
        spender: PAYMENTS_CONTRACT_ADDRESS,
        value: allowance,
        nonce,
        deadline,
    }
    try {
        const signature = await context.walletProvider.send(
            'eth_signTypedData_v4',
            [address, JSON.stringify(CreateEIP2612Permit(domain, permit))]
        )
        let sig = utils.splitSignature(signature)

        context.paymentsContractSigner.payWithPermit(
            USDT_CONTRACT_ADDRESS,
            value,
            allowance,
            deadline,
            sig.v,
            sig.r,
            sig.s,
            { gasLimit: 150000 }
        )
    } catch (e) {
        console.log(e)
    }
}

function CreateEIP2612Permit(
    domain: {
        name: string
        version: string
        chainId: number
        verifyingContract: string
    },
    message: {
        owner: string
        spender: string
        value: string
        nonce: string
        deadline: string
    }
): any {
    console.log(
        `EIP2612 Domain
		Name: ${domain.name}
		Verifying Contract: ${domain.verifyingContract}
		Version: ${domain.version}
		ChainId: ${domain.chainId}

		Message
		Owner: ${message.owner}
		Spender: ${message.spender}
		Value: ${message.value}
		Nonce: ${message.nonce}
		Deadline: ${message.deadline}`
    )

    return {
        domain,
        primaryType: 'Permit',
        message,
        types: {
            EIP712Domain: [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' },
            ],
            Permit: [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
            ],
        },
    }
}

export default styled(App)`
    .logo {
        margin-left: 24px;
        width: 200px;
    }

    .content {
        text-align: center;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        left: 0;
        right: 0;
    }

    .title {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 700;
        font-size: 60px;
        line-height: 73px;

        margin: 34px 0;
    }

    .form {
        display: flex;
        justify-content: center;

        .textfield {
            width: 400px;
            height: 40px;
            text-indent: 20px;

            border: 2px solid black;
            border-radius: 10px 0 0 10px;
        }

        .dropdown {
            font-size: 16px;
            line-height: 40px;
            border: 2px solid black;
            border-left: none;
            border-radius: 0 10px 10px 0;
            background-color: #6982de;
            color: white;
            cursor: pointer;
        }
    }

    .submitBtn {
        background: linear-gradient(98.29deg, #2b7fff 10.91%, #12299e 100%);
        box-shadow: 4px 4px 20px rgba(0, 0, 0, 0.1);
        border-radius: 300px;

        padding: 8px 32px;
        margin-left: 30px;

        color: white;
        box-shadow: none;
        border: none;
        cursor: pointer;

        font-size: 16px;
    }

    :root {
        /* CUSTOMIZE THE COLOR  PALLETTE */
        --onboard-white: white;
        --onboard-black: black;
        --onboard-primary-1: #2f80ed;
        --onboard-primary-100: #eff1fc;
        --onboard-primary-200: #d0d4f7;
        --onboard-primary-300: #b1b8f2;
        --onboard-primary-400: #929bed;
        --onboard-primary-500: #6370e5;
        --onboard-primary-600: #454ea0;
        --onboard-primary-700: #323873;
        --onboard-gray-100: #ebebed;
        --onboard-gray-200: #c2c4c9;
        --onboard-gray-300: #999ca5;
        --onboard-gray-400: #707481;
        --onboard-gray-500: #33394b;
        --onboard-gray-600: #242835;
        --onboard-gray-700: #1a1d26;
        --onboard-success-100: #d1fae3;
        --onboard-success-200: #baf7d5;
        --onboard-success-300: #a4f4c6;
        --onboard-success-400: #8df2b8;
        --onboard-success-500: #5aec99;
        --onboard-success-600: #18ce66;
        --onboard-success-700: #129b4d;
        --onboard-danger-100: #ffe5e6;
        --onboard-danger-200: #ffcccc;
        --onboard-danger-300: #ffb3b3;
        --onboard-danger-400: #ff8080;
        --onboard-danger-500: #ff4f4f;
        --onboard-danger-600: #cc0000;
        --onboard-danger-700: #660000;
        --onboard-warning-100: #ffefcc;
        --onboard-warning-200: #ffe7b3;
        --onboard-warning-300: #ffd780;
        --onboard-warning-400: #ffc74c;
        --onboard-warning-500: #ffaf00;
        --onboard-warning-600: #cc8c00;
        --onboard-warning-700: #664600;

        /* CUSTOMIZE SECTIONS OF THE CONNECT MODAL */
        // --onboard-connect-content-width
        // --onboard-connect-content-height
        // --onboard-wallet-columns
        // --onboard-connect-sidebar-background
        // --onboard-connect-sidebar-color
        // --onboard-connect-sidebar-progress-background
        // --onboard-connect-sidebar-progress-color
        // --onboard-connect-header-background
        // --onboard-connect-header-color
        // --onboard-link-color
        // --onboard-close-button-background
        // --onboard-close-button-color
        // --onboard-checkbox-background
        // --onboard-checkbox-color
        // --onboard-wallet-button-background
        // --onboard-wallet-button-background-hover
        // --onboard-wallet-button-color
        // --onboard-wallet-button-border-color
        // --onboard-wallet-app-icon-border-color

        /* FONTS */
        // --onboard-font-family-normal: Sofia Pro;
        // --onboard-font-family-semibold: Sofia Pro Semibold;
        // --onboard-font-family-light: Sofia Pro Light;

        --onboard-font-size-1: 3rem;
        --onboard-font-size-2: 2.25rem;
        --onboard-font-size-3: 1.5rem;
        --onboard-font-size-4: 1.25rem;
        --onboard-font-size-5: 1rem;
        --onboard-font-size-6: 0.875rem;
        --onboard-font-size-7: 0.75rem;

        /* SPACING */
        --onboard-spacing-1: 3rem;
        --onboard-spacing-2: 2rem;
        --onboard-spacing-3: 1.5rem;
        --onboard-spacing-4: 1rem;
        --onboard-spacing-5: 0.5rem;

        /* SHADOWS */
        --onboard-shadow-1: 0px 4px 12px rgba(0, 0, 0, 0.1);
        --onboard-shadow-2: inset 0px -1px 0px rgba(0, 0, 0, 0.1);
    }
`
