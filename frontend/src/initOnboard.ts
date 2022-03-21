import { init } from '@web3-onboard/react'

import injectedModule from '@web3-onboard/injected-wallets'
import walletConnectModule from '@web3-onboard/walletconnect'
// import trezorModule from '@web3-onboard/trezor'
// import ledgerModule from '@web3-onboard/ledger'

const injected = injectedModule()
const walletConnect = walletConnectModule()

export const chains = [
    {
        id: '0x15b38',
        token: 'TACT',
        label: 'Amino X Dev',
        rpcUrl: 'http://localhost:9933',
    },
    // {
    //     id: '0x343A',
    //     token: 'TACT',
    //     label: 'Amino X Testnet',
    //     rpcUrl: 'https://aminoxtestnet.node.alphacarbon.network',
    // },
]

const web3Onboard = init({
    wallets: [injected, walletConnect],
    chains,
    appMetadata: {
        name: 'Payments Demo',
        icon: '<svg><svg/>',
        description: 'Payments Workflow',
        recommendedInjectedWallets: [
            { name: 'MetaMask', url: 'https://metamask.io' },
        ],
    },
})

export default web3Onboard

// import Onboard from 'bnc-onboard'
// import { Subscriptions } from 'bnc-onboard/dist/src/interfaces'

// const networkId = 88888
// const rpcUrl = `http://localhost:19932`

// export function initOnboard(subscriptions: Subscriptions) {
//     return Onboard({
//         // dappId,
//         hideBranding: true,
//         networkId,
//         // apiUrl,
//         darkMode: true,
//         subscriptions,
//         walletSelect: {
//             wallets: [
//                 { walletName: 'metamask', preferred: true },
//                 // {
//                 //     walletName: 'walletConnect',
//                 //     preferred: true,
//                 //     infuraKey: infuraId,
//                 // },
//                 // {
//                 //     walletName: 'trezor',
//                 //     appUrl: 'https://memenumbers.com',
//                 //     email: '',
//                 //     rpcUrl,
//                 // },
//                 // {
//                 //     walletName: 'ledger',
//                 //     rpcUrl,
//                 // },
//                 // { walletName: 'coinbase' },
//                 // { walletName: 'status' },
//                 // { walletName: 'walletLink', rpcUrl },
//                 // {
//                 //     walletName: 'portis',
//                 //     apiKey: 'b2b7586f-2b1e-4c30-a7fb-c2d1533b153b',
//                 // },
//                 // { walletName: 'cobovault', appName: 'React Demo', rpcUrl },
//                 // { walletName: 'keystone', appName: 'React Demo', rpcUrl },
//                 // { walletName: 'keepkey', rpcUrl },
//                 // {
//                 //     walletName: 'lattice',
//                 //     appName: 'Onboard Demo',
//                 //     rpcUrl,
//                 // },
//                 // { walletName: 'fortmatic', apiKey: 'pk_test_886ADCAB855632AA' },
//                 // { walletName: 'torus' },
//                 // { walletName: 'trust', rpcUrl },
//                 // { walletName: 'opera' },
//                 // { walletName: 'operaTouch' },
//                 // { walletName: 'imToken', rpcUrl },
//                 // { walletName: 'meetone' },
//                 // { walletName: 'mykey', rpcUrl },
//                 // { walletName: 'wallet.io', rpcUrl },
//                 // { walletName: 'huobiwallet', rpcUrl },
//                 // { walletName: 'alphawallet', rpcUrl },
//                 // { walletName: 'hyperpay' },
//                 // { walletName: 'atoken' },
//                 // { walletName: 'liquality' },
//                 // { walletName: 'frame' },
//                 // { walletName: 'tokenpocket', rpcUrl },
//                 // { walletName: 'authereum', disableNotifications: true },
//                 // { walletName: 'ownbit' },
//                 // { walletName: 'gnosis' },
//                 // { walletName: 'dcent' },
//                 // { walletName: 'bitpie' },
//                 // { walletName: 'xdefi' },
//                 // { walletName: 'binance' },
//                 // { walletName: 'tp' },
//             ],
//         },
//         walletCheck: [
//             { checkName: 'derivationPath' },
//             { checkName: 'connect' },
//             { checkName: 'accounts' },
//             { checkName: 'network' },
//             { checkName: 'balance', minimumBalance: '100000' },
//         ],
//     })
// }
