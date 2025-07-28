from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import Application, CommandHandler, ContextTypes

# DApp links (name: url)
DAPP_LINKS = {
    "Kinza Finance": "https://app.kinza.finance/",
    "Shmonad": "https://shmonad.xyz/",
    "Octo Exchange": "https://octo.exchange/",
    "Folks Finance (Testnet)": "https://testnet.xapp.folks.finance/",
    "APR Stake": "https://stake.apr.io/",
    "Bebop Trade": "https://bebop.xyz/trade?network=monad",
    "Bean Swap": "https://swap.bean.exchange/",
    "Monadroids": "https://www.monadroids.xyz/",
    "Rubic Exchange": "https://testnet.rubic.exchange/?fromChain=UNICHAIN_SEPOLIA_TESTNET&toChain=UNICHAIN_SEPOLIA_TESTNET",
    "Aicraft - Fizen": "https://aicraft.fun/projects/fizen",
    "PancakeSwap Monad Testnet": "https://pancakeswap.finance/swap?chain=monadTestnet",
    "Pingu Exchange": "https://pingu.exchange/trade/ETH-USD",
    "Magma Staking": "https://www.magmastaking.xyz/",
    "Talentum Quests": "https://monad.talentum.id/quests",
    "Nostra Finance": "https://monad.nostra.finance/lend-borrow",
}

# Start command
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # Top permanent Monad button
    top_button = [[InlineKeyboardButton("🔗 Monad Official Site", url="https://monad.xyz")]]

    # Create DApp buttons (2 per row)
    dapp_buttons = []
    row = []
    for i, (name, url) in enumerate(DAPP_LINKS.items(), 1):
        row.append(InlineKeyboardButton(name, url=url))
        if i % 2 == 0:
            dapp_buttons.append(row)
            row = []
    if row:
        dapp_buttons.append(row)

    # Combine all buttons
    keyboard = top_button + dapp_buttons
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        "🚀 Welcome to the Monad DApp Explorer!\nTap below to explore Monad dApps:",
        reply_markup=reply_markup
    )

# Run the bot
def main():
    app = Application.builder().token("8099890985:AAHhI-dHuIS9RPeE2Vp5_ezuY1i_Z89iQ9o").build()
    app.add_handler(CommandHandler("start", start))
    app.run_polling()

if __name__ == '__main__':
    main()
