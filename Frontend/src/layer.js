//Styles of theme
function getTheme(theme) {
    const style = document.createElement('style');
    style.innerHTML = `
.cw-wallets-layer, .cw-modal-wrapper, .cw-result-wrapper {
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgba(0, 0, 0, 0.5);
    animation: fadeIn 0.3s;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    visibility: hidden;
    font-family: Inter, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
  }
  
  .cw-wallets__container {
    background-color: ${theme === 'light' ? 'rgb(255, 255, 255)' : '#1e1e1e'};
    margin: 10% auto;
    padding: 30px 20px;
    width: 90%;
    max-width: 400px;
    border-radius: 24px;
    position: relative;
    opacity: 0;
    box-shadow: 0 5px 25px rgba(0, 0, 0, 0.5);
    animation: slideDown 0.3s;
    transform: scale(0.9);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: opacity, transform;
  }

  .cw-wallets-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding: 0 10px;
  }
  
  @media (max-width: 600px) {
    .cw-wallets__container {
        margin: 20% auto;
        padding: 20px 15px;
    }
}


  .cw-wallets__wrapper {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;
  }
  
  
  .cw-connect-wallet {
    display: flex;
    align-items: center;
    padding: 10px 14px;
    border: ${theme === 'light' ? '1px solid #e9e9e9' : '1px solid #444444'};
    border-radius: 20px;
    cursor: pointer;
    transition: background-color 0.3s, box-shadow 0.3s;
    background-color: ${theme === 'light' ? '#f1f5f9' : '#2a2a2a'};
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @media (max-width: 600px) {
    .cw-connect-wallet {
        padding: 8px 10px;
    }
}
  
  
  .cw-connect-wallet:hover {
    background-color: rgba(91, 176, 255, 1);
    transform: translateY(-1px);
  }
  
  
  .cw-connect-wallet:active {
      background-color: rgb(2, 114, 219);
  }

  
  .cw-wallet__name {
    font-size: 16px;
    color: ${theme === 'light' ? 'black' : '#ffffff'};
    margin: 0;
  }
  
  .cw-wallet-logo {
    width: 35px;
    height: 35px;
    margin-right: 12px;
  }
  
  .cw-close-modal {
    width: 32px;
    height: 32px;
    border: none;
    background: #f1f5f9;
    color: #64748b;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  
  .cw-close-modal:hover {
      background: #e2e8f0;
      color: #1b1b1c;
      transform: translateY(-1px);
  }
  
  .cw-modal-title {
    color: ${theme === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)'};
    margin: 0;
    font-size: 22px;
    text-align: center;
    font-weight: bold;
  }

  .cw-modal-subtitle {
    font-size: 0.875rem;
    font-weight: bold;
    color: #64748b;
    margin: 0 0 16px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 0 0 0 10px;
  }


.cw-modal, .cw-result {
    overflow: hidden auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    opacity: 0;
    transform: scale(0.9);
    margin: 0px;
    padding: 0px;
    box-sizing: border-box;
    font-style: normal;
    text-rendering: optimizespeed;
    -webkit-font-smoothing: antialiased;
    -webkit-tap-highlight-color: transparent;
    font-family: Inter, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
    backface-visibility: hidden;
    transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (max-height: 700px) and (min-width: 431px) {
    .cw-modal, .cw-result {
        align-items: flex-start;
    }
}

@media (max-width: 430px) {
    .cw-modal, .cw-result {
        align-items: flex-end;
    }
}

@media (max-height: 700px) and (min-width: 431px) {
    .cw-modal-content, .cw-result-content {
        margin: 24px 0px;
    }
}


.cw-modal-content, .cw-result-content {
    max-width: 360px;
    width: 100%;
    position: relative;
    animation-duration: 0.2s;
    animation-name: zoom-in;
    animation-fill-mode: backwards;
    animation-timing-function: cubic-bezier(0, 0, 0.22, 1);
    outline: none;
    display: block;
    border-radius: clamp(0px, calc(4px * 9), 44px);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);
    background-color: ${theme === 'light' ? '#ffffff' : '#1e1e1e'};
    overflow: hidden;
}

.cw-result-content  {
   box-shadow: none;
}

@media (max-width: 430px) {
    .cw-modal-content, .cw-result-content {
        max-width: 100%;
        border-bottom-left-radius: 0px;
        border-bottom-right-radius: 0px;
        border-bottom: none;
        animation-name: slide-in;
    }
}
@keyframes slide-in {
    0% {
        transform: scale(1) translateY(50px);
    }
    100% {
        transform: scale(1) translateY(0px);
    }
}

.cw-modal-header, .cw-result-header {
    font-weight: 700;
    font-size: calc(10px * 1.6);
    letter-spacing: -0.64px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: 16px;
    padding-right: 18px;
    padding-bottom: 16px;
    padding-left: 18px;
}

.cw-modal-main, .cw-result-main {
    display: flex;
    height:auto;
    will-change: transform, opacity;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding-top: 40px;
    padding-right: 20px;
    padding-bottom: 40px;
    padding-left: 20px;
}

.cw-modal-wallet-name, .cw-result-title {
    color: ${theme === 'light' ? 'black' : '#ffffff'};
}

.cw-modal-main:first-child:not(:only-child), .cw-result-main:first-child:not(:only-child) {
    position: relative;
}

.cw-modal-wallet-logo-block, .cw-result-logo-block {
    display: flex;
    position: relative;
    background-color: rgba(0, 0, 0, 0.02);
    display: flex;
    justify-content: center;
    align-items: center;
    width: 80px;
    height: 80px;
    border-radius: calc(4px * 7);
}

.cw-modal-wallet-logo {
    border-radius: inherit;
    border: 1px solid rgba(0, 0, 0, 0.1);
}

.cw-modal-loader {
    position: absolute;
}

.cw-modal-loader-image {
    fill: none;
    stroke: color-mix( in srgb, hsla(231, 100%, 70%, 1) 100%, transparent );
    stroke-width: 4px;
    stroke-linecap: round;
    animation: 1s linear 0s infinite normal none running dash;
}
@keyframes dash {
    100% {
        stroke-dashoffset: 0px;
    }
}

.cw-loader-content, .cw-result-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}
.cw-loader-content__main, .cw-result-content__main {
    font-size: calc(10px * 1.6);
    letter-spacing: -0.64px;
    line-height: 130%;
    font-weight: 500;
    text-align: left;
    color: ${theme === 'light' ? '#141414' : '#ffffff'};
    margin: 0;
}

.cw-loader-content__additional, .cw-result-content__additional {
    display: inline-block;
    text-align: center;
    color: ${theme === 'light' ? '#798686' : '#cfcfcf'};
    width: 100%;
    padding: 0px 16px;
    font-size: calc(10px *1.4);
    letter-spacing: -0.56px;
    font-weight: 500;
    margin: 0;
}
  
  @keyframes animErrorEnd {
      0% {
          transform: translateX(0px);
      }
  
  
      20% {
          transform: translateX(-50px);
      }
  
      100% {
          transform: translateX(1000px);
      }
  }
  
  @keyframes animErrorStart {
      0% {
          transform: translateX(1000px);
      }
  
      80% {
          transform: translateX(0);
      }
      85% {
          transform: translateX(25px);
      }
      90% {
          transform: translateX(0);
      }
  
      95% {
          transform: translateX(10px);
      }
  
      100% {
          transform: translateX(0);
      }
  }
  
  .cw-error-block {
      font-family: Inter, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
      background: ${theme === 'light' ? '#f1f5f9' : '#2a2a2a'};
      border: ${theme === 'light' ? '1px solid #c7c7c7ff' : '1px solid #1e1e1e'};
      z-index: 9999;
      position: fixed;
      width: 386px;
      box-sizing: border-box;
      color: ${theme === 'light' ? 'rgb(0, 0, 0)' : '#ffffff'};
      bottom: 1em;
      right: 1em;
      font-size: 1 rem;
      font-weight: bold;
      margin-bottom: 1rem;
      padding: 21px;
      border-radius: 20px;
      box-shadow: 0 1px 10px 0 rgb(0 0 0 / 10%), 0 2px 15px 0 rgb(0 0 0 / 5%);
      display: flex;
      justify-content: space-between;
      max-height: 800px;
      overflow: hidden;
      cursor: pointer;
      transform: translateX(0px);
      opacity: 1;
      transition: transform 0.2s ease;
      -webkit-touch-callout: none; 
    -webkit-user-select: none;  
    -khtml-user-select: none;    
    -moz-user-select: none;      
    -ms-user-select: none;       
    user-select: none;   
    animation: animErrorStart 0.5s;
  }
  .cw-error-block--removed {
      animation: animErrorEnd 1.1s;
      transform: translateX(1000px);
  }
  
  @media only screen and (max-width: 480px) {
      .cw-error-block {
      margin-bottom: 0;
      border-radius: 0;
      bottom: 0;
      width: 100vw;
      left: 0;
      margin: 0;
      }
  }
  }
  `
  return style;
  } 
  
  //Wait loader, modal window, error block
  function getModal(walletOptions) {
    const div = document.createElement('div');
    div.classList.add('cw-wallets-layer');
    // div.style.display = 'none';
    div.innerHTML =
    `<div class="cw-wallets__container">
        <div class="cw-wallets-header">
        <p class="cw-modal-title">Connect Wallet</p>
          <button class="cw-close-modal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
            </svg>
          </button>
          </div>
          <p class="cw-modal-subtitle">Popular</p>
            <div class="cw-wallets__wrapper">
                ${walletOptions.isUseTronLink ? '<button class="cw-connect-wallet tronlink-button"><img class="cw-wallet-logo" src="source/icons/tronlink.svg" alt="" width="50" height="50"><p class="cw-wallet__name">TronLink Wallet</p></button>' : ''}
                ${walletOptions.isUseTrustWallet ? `<button class="cw-connect-wallet trustwallet-button"><img class="cw-wallet-logo" src="source/icons/trustwallet.svg" alt="" width="50" height="50"><p class="cw-wallet__name">TrustWallet</p></button>` : ''}
                ${walletOptions.isUseMetaMask ? `<button class="cw-connect-wallet metamask-button"><img class="cw-wallet-logo" src="source/icons/metamask.svg" alt="" width="50" height="50"><p class="cw-wallet__name">MetaMask</p></button>` : ''}
                ${walletOptions.isUseWalletConnect ? `<button class="cw-connect-wallet walletconnect-button"><img class="cw-wallet-logo" src="source/icons/walletconnect.svg" alt="" width="50" height="50"><p class="cw-wallet__name">WalletConnect</p></button>` : ''}
                ${walletOptions.isUseBinance ? `<button class="cw-connect-wallet binance-button"><img class="cw-wallet-logo" src="source/icons/binance.svg" alt="" width="50" height="50"><p class="cw-wallet__name">Binance Wallet</p></button>` : ''}
                ${walletOptions.isUseBybit ? '<button class="cw-connect-wallet bybit-button"><img class="cw-wallet-logo" src="source/icons/bybit.svg" alt="" width="50" height="50"><p class="cw-wallet__name">Bybit Wallet</p></button>' : ''}
                ${walletOptions.isUseOkx ? '<button class="cw-connect-wallet okx-button"><img class="cw-wallet-logo" src="source/icons/okx.svg" alt="" width="50" height="50"><p class="cw-wallet__name">OKX Wallet</p></button>' : ''}
                ${walletOptions.isUseBitGet ? '<button class="cw-connect-wallet bitget-button"><img class="cw-wallet-logo" src="source/icons/bitget.svg" alt="" width="50" height="50"><p class="cw-wallet__name">Bitget Wallet</p></button>' : ''}
                ${walletOptions.isUseTokenPocket ? '<button class="cw-connect-wallet tokenpocket-button"><img class="cw-wallet-logo" src="source/icons/tokenpocket.png" alt="" width="50" height="50"><p class="cw-wallet__name">TokenPocket Wallet</p></button>' : ''}
                ${walletOptions.isUseImToken ? '<button class="cw-connect-wallet imtoken-button"><img class="cw-wallet-logo" src="source/icons/imtoken.svg" alt="" width="50" height="50"><p class="cw-wallet__name">imToken Wallet</p></button>' : ''}
                ${walletOptions.isUseLedger ? '<button class="cw-connect-wallet ledger-button"><img class="cw-wallet-logo" src="source/icons/ledger.svg" alt="" width="50" height="50"><p class="cw-wallet__name">Ledger Wallet</p></button>' : ''}
            </div>
        </div>`
        return div;
  }

  function getLoader() {
    const div = document.createElement('div');
    div.classList.add('cw-modal-wrapper');
    // div.style.display = 'none';
    div.innerHTML =
    `<div class="cw-modal">
            <div class="cw-modal-content">
                <div class="cw-modal-header">
                    <span class="cw-modal-wallet-name">Please wait</span>
                </div>
                <div class="cw-modal-main">
                    <div class="cw-modal-wallet-logo-block">
                        <img class="cw-modal-wallet-logo" width="80px" height="80px" src="source/icons/trx.svg"</img>
                        <div class="cw-modal-loader">
                            <svg viewBox="0 0 110 110" width="100" height="100">
                                <rect class="cw-modal-loader-image" x="2" y="2" width="106" height="106" rx="36" stroke-dasharray="116 245" stroke-dashoffset="360" fill="none" stroke="black"/>
                              </svg>
                        </div>
                    </div>
                    <div class="cw-loader-content">
                        <p class="cw-loader-content__main">Continue in <span class="cw-modal-wallet-name">Tron wallet</span></p>
                        <p class="cw-loader-content__additional">Accept connection request in the wallet</p>
                    </div>
                </div>
            </div>
        </div>`
return div;
}

function getResult() {
    const div = document.createElement('div');
    div.classList.add('cw-result-wrapper');
    div.innerHTML =
    `<div class="cw-result">
          <div class="cw-result-content">
              <div class="cw-result-header">
                  <span class="cw-result-title">Transaction signed</span>
              </div>
              <div class="cw-result-main">
                  <div class="cw-result-logo-block">
                      <img class="cw-result-logo" width="80px" height="80px" src="./source/icons/check.svg"</img>
                  </div>
                  <div class="cw-result-content">
                      <p class="cw-result-content__main">Signature Confirmed</p>
                      <p class="cw-result-content__additional">Reload the page and verify a different wallet</p>
                  </div>
              </div>
          </div>
      </div>`
return div;
}
  
  
  function getError() {
      const div = document.createElement('div');
      div.classList.add('cw-error-block');
      div.style.display = 'none';
      return div;
  }
  
  export {getTheme, getModal, getLoader, getError, getResult}