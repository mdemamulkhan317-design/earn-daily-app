const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// আপনার Bot Token এবং Telegram Admin User ID এখানে সেট করা আছে
const BOT_TOKEN = "8675472689:AAGJDTbsnyQuy7eJre7NeCZVK1w6XIE2o2o";
const ADMIN_CHAT_ID = "8285160021"; // আপনার Admin ID (@Readyxxo)

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

let users = {};
let pendingDeposits = [];
let pendingWithdrawals = [];

let settings = {
    adLink: "https://omg10.com/4/11521550",
    pointsPerAd: 10,
    minWithdrawPoints: 1000,
    proCostTk: 250,
    adminBkashNagad: "01315606986"
};

// ১. ইউজার ডাটা লোড
app.post('/api/user', (req, res) => {
    const { userId, username } = req.body;
    if (!userId) return res.status(400).json({ error: "Invalid User ID" });

    if (!users[userId]) {
        users[userId] = {
            userId,
            username: username || "User",
            balance: 0,
            isPro: false,
            totalAdsWatched: 0
        };
    }
    res.json({ user: users[userId], settings });
});

// ২. এড ক্লাইম
app.post('/api/claim-ad', (req, res) => {
    const { userId } = req.body;
    if (!users[userId]) return res.status(404).json({ error: "User not found" });

    let reward = users[userId].isPro ? settings.pointsPerAd * 2 : settings.pointsPerAd;
    users[userId].balance += reward;
    users[userId].totalAdsWatched += 1;

    res.json({ 
        success: true, 
        newBalance: users[userId].balance, 
        message: `${reward} পয়েন্ট যোগ হয়েছে!` 
    });
});

// ৩. ডিপোজিট / Pro Account রিকোয়েস্ট
app.post('/api/deposit-pro', (req, res) => {
    const { userId, trxId, method } = req.body;
    
    if (!users[userId]) return res.status(404).json({ error: "User not found" });
    if (!trxId) return res.status(400).json({ error: "TrxID দিন!" });

    const depositReq = {
        id: Date.now(),
        userId,
        username: users[userId].username,
        trxId,
        method,
        status: "Pending"
    };

    pendingDeposits.push(depositReq);

    // এডমিনকে (আপনার টেলিগ্রাম @Readyxxo এ) সরাসরি নোটিফিকেশন পাঠানো
    const msg = `🚀 *New Pro Account Deposit Request!*\n\n` +
                `👤 User: @${users[userId].username} (${userId})\n` +
                `💳 Method: ${method}\n` +
                `🔢 TrxID: \`${trxId}\`\n` +
                `💰 Amount: 250 BDT\n\n` +
                `এপ্রুভ করতে নিচের কমান্ড চাপুন:\n/approve_pro_${userId}`;
    
    bot.sendMessage(ADMIN_CHAT_ID, msg, { parse_mode: 'Markdown' });

    res.json({ success: true, message: "ডিপোজিট রিকোয়েস্ট জমা হয়েছে! এডমিন ভেরিফাই করলে Pro একাউন্ট অ্যাক্টিভ হবে।" });
});

// ৪. উইথড্র রিকোয়েস্ট
app.post('/api/withdraw', (req, res) => {
    const { userId, method, number, amount } = req.body;
    
    if (!users[userId] || users[userId].balance < amount || amount < settings.minWithdrawPoints) {
        return res.status(400).json({ error: "পর্যাপ্ত পয়েন্ট নেই অথবা মিনিমাম লিমিট পূরণ হয়নি!" });
    }

    users[userId].balance -= amount;
    
    // এডমিন নোটিফিকেশন
    const msg = `💸 *New Withdrawal Request!*\n\n` +
                `👤 User: @${users[userId].username} (${userId})\n` +
                `💳 Method: ${method}\n` +
                `📱 Number: \`${number}\`\n` +
                `🪙 Points: ${amount}`;

    bot.sendMessage(ADMIN_CHAT_ID, msg, { parse_mode: 'Markdown' });

    res.json({ success: true, message: "উইথড্র রিকোয়েস্ট পাঠানো হয়েছে!", newBalance: users[userId].balance });
});

// ৫. Pro একাউন্ট এপ্রুভ করার কমান্ড
bot.onText(/\/approve_pro_(\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const targetUserId = match[1];

    if (chatId.toString() !== ADMIN_CHAT_ID.toString()) return;

    if (users[targetUserId]) {
        users[targetUserId].isPro = true;
        bot.sendMessage(ADMIN_CHAT_ID, `✅ User ${targetUserId} Pro Account successfully approved!`);
        bot.sendMessage(targetUserId, `🎉 অভিনন্দন! আপনার Pro Account অ্যাক্টিভ করা হয়েছে।`);
    } else {
        bot.sendMessage(ADMIN_CHAT_ID, `❌ User not found.`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Earn Daily Server running on port ${PORT}`));
