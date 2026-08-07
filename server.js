const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

let users = {};
let pendingWithdrawals = [];

let settings = {
    adLink: "https://omg10.com/4/11521550", // Monetag Direct Link
    pointsPerAd: 10,
    minWithdrawPoints: 1000,
    pointToTkRate: 0.1
};

app.post('/api/user', (req, res) => {
    const { userId, username } = req.body;
    if (!userId) return res.status(400).json({ error: "Invalid User ID" });

    if (!users[userId]) {
        users[userId] = {
            userId,
            username: username || "User",
            balance: 0,
            totalAdsWatched: 0
        };
    }
    res.json({ user: users[userId], settings });
});

app.post('/api/claim-ad', (req, res) => {
    const { userId } = req.body;
    if (!users[userId]) return res.status(404).json({ error: "User not found" });

    users[userId].balance += settings.pointsPerAd;
    users[userId].totalAdsWatched += 1;

    res.json({ 
        success: true, 
        newBalance: users[userId].balance, 
        message: `${settings.pointsPerAd} পয়েন্ট যোগ হয়েছে!` 
    });
});

app.post('/api/withdraw', (req, res) => {
    const { userId, method, number, amount } = req.body;
    
    if (!users[userId] || users[userId].balance < amount || amount < settings.minWithdrawPoints) {
        return res.status(400).json({ error: "পর্যাপ্ত পয়েন্ট নেই অথবা মিনিমাম লিমিট পূরণ হয়নি!" });
    }

    users[userId].balance -= amount;
    
    const withdrawalRequest = {
        id: Date.now(),
        userId,
        method,
        number,
        amount,
        status: "Pending"
    };

    pendingWithdrawals.push(withdrawalRequest);
    res.json({ success: true, message: "উইথড্র রিকোয়েস্ট পাঠানো হয়েছে!", newBalance: users[userId].balance });
});

app.get('/api/admin/withdrawals', (req, res) => {
    res.json(pendingWithdrawals);
});

app.post('/api/admin/update-settings', (req, res) => {
    const { adLink, pointsPerAd } = req.body;
    if (adLink) settings.adLink = adLink;
    if (pointsPerAd) settings.pointsPerAd = pointsPerAd;
    res.json({ success: true, settings });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Earn Daily Server running on port ${PORT}`));
