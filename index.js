const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = process.env.TELEGRAM_TOKEN;

const bot = new TelegramBot(token);

const app = express();
app.use(express.json());

const webhookPath = '/webhook';

// DATA MENU
const menu = {
    nasgor: { nama: "Nasi Goreng Spesial", harga: 25000 },
    ayam: { nama: "Ayam Bakar Madu", harga: 30000 },
    sate: { nama: "Sate Ayam", harga: 28000 },
    mie: { nama: "Mie Goreng Jawa", harga: 24000 },
    esteh: { nama: "Es Teh Manis", harga: 8000 },
    jus: { nama: "Jus Alpukat", harga: 15000 }
};

// START MENU
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Halo Kak 😊 Selamat datang di Rasa Nusantara 🍽️", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🍽️ Lihat Menu", callback_data: "menu" }],
                [{ text: "⭐ Rekomendasi", callback_data: "rekomendasi" }],
                [{ text: "🛒 Pesan Makanan", callback_data: "pesan" }],
                [{ text: "📍 Lokasi & Jam", callback_data: "info" }],
                [{ text: "📞 Customer Service", callback_data: "cs" }]
            ]
        }
    });
});

// BUTTON HANDLER
bot.on("callback_query", (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    // LIHAT MENU
    if (data === "menu") {
        bot.sendMessage(chatId,
`🍽️ MENU KAMI:

🍛 Nasi Goreng Spesial - Rp25.000
🍗 Ayam Bakar Madu - Rp30.000
🍢 Sate Ayam - Rp28.000
🍜 Mie Goreng Jawa - Rp24.000
🥤 Es Teh Manis - Rp8.000
🥑 Jus Alpukat - Rp15.000`
        );
    }

    // REKOMENDASI
    if (data === "rekomendasi") {
        bot.sendMessage(chatId,
`⭐ Rekomendasi Kami:

🍗 Ayam Bakar Madu - favorit pelanggan!
🍛 Nasi Goreng Spesial - gurih & mengenyangkan
🥑 Jus Alpukat - segar & creamy 😋`
        );
    }

    // PESAN
    if (data === "pesan") {
        bot.sendMessage(chatId, "Silakan pilih menu yang ingin dipesan 😊", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🍛 Nasi Goreng", callback_data: "nasgor" }],
                    [{ text: "🍗 Ayam Bakar", callback_data: "ayam" }],
                    [{ text: "🍢 Sate Ayam", callback_data: "sate" }],
                    [{ text: "🍜 Mie Goreng", callback_data: "mie" }],
                    [{ text: "🥤 Es Teh", callback_data: "esteh" }],
                    [{ text: "🥑 Jus Alpukat", callback_data: "jus" }]
                ]
            }
        });
    }

    // PILIH MENU (ORDER)
    if (menu[data]) {
        const item = menu[data];

        bot.sendMessage(chatId,
`🧾 PESANAN ANDA

Menu: ${item.nama}
Harga: Rp${item.harga}

Ketik format berikut untuk order:
Nama - Jumlah

Contoh:
Budi - 2`
        );
    }

    // INFO RESTO
    if (data === "info") {
        bot.sendMessage(chatId,
`📍 Lokasi:
Jl. Sudirman No. 123, Jakarta

🕒 Jam Operasional:
Setiap hari 10.00 - 22.00`
        );
    }

    // CUSTOMER SERVICE
    if (data === "cs") {
        bot.sendMessage(chatId, "📞 Hubungi Admin: @adminresto");
    }

    bot.answerCallbackQuery(query.id);
});

// HANDLE ORDER TEXT
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Hindari bentrok dengan /start
    if (text.startsWith("/")) return;

    // Format: Nama - Jumlah
    if (text.includes("-")) {
        const [nama, jumlah] = text.split("-").map(t => t.trim());

        if (!nama || !jumlah || isNaN(jumlah)) {
            return bot.sendMessage(chatId, "Format salah ya Kak 😅\nContoh: Budi - 2");
        }

        bot.sendMessage(chatId,
`✅ PESANAN DITERIMA

Nama: ${nama}
Jumlah: ${jumlah}

Pesanan sedang diproses ya Kak 🍽️
Terima kasih 🙏`
        );
    }
});

// WEBHOOK ENDPOINT
app.post(webhookPath, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server jalan di port ${PORT}`);

    const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
    if (domain) {
        const webhookUrl = `https://${domain}${webhookPath}`;
        try {
            await bot.setWebHook(webhookUrl);
            console.log(`Webhook set: ${webhookUrl}`);
        } catch (err) {
            console.error('Gagal set webhook:', err.message);
        }
    }
});