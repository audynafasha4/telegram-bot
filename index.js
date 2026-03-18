const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = process.env.TELEGRAM_TOKEN;

if (!token) {
    console.error('❌ TELEGRAM_TOKEN tidak ditemukan di environment variables!');
    process.exit(1); // Keluar kalau token kosong biar Railway restart & kamu notice
}

console.log('✅ Token ditemukan, bot siap start...');

const bot = new TelegramBot(token, { polling: false }); // Mulai tanpa polling dulu

const app = express();
app.use(express.json());

const webhookPath = '/webhook';

// DATA MENU (bisa ditambah foto atau deskripsi nanti)
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
    bot.sendMessage(chatId, "Halo Kak 😊 Selamat datang di **Rasa Nusantara** 🍽️\nMakanan Nusantara asli & lezat!", {
        parse_mode: 'Markdown',
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
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    try {
        if (data === 'menu') {
            await bot.sendMessage(chatId,
`🍽️ **MENU KAMI**:

🍛 Nasi Goreng Spesial - Rp25.000
🍗 Ayam Bakar Madu - Rp30.000
🍢 Sate Ayam - Rp28.000
🍜 Mie Goreng Jawa - Rp24.000
🥤 Es Teh Manis - Rp8.000
🥑 Jus Alpukat - Rp15.000`,
                { parse_mode: 'Markdown' }
            );
        }

        if (data === 'rekomendasi') {
            await bot.sendMessage(chatId,
`⭐ **Rekomendasi Kami**:

🍗 Ayam Bakar Madu - favorit pelanggan!
🍛 Nasi Goreng Spesial - gurih & mengenyangkan
🥑 Jus Alpukat - segar & creamy 😋`,
                { parse_mode: 'Markdown' }
            );
        }

        if (data === 'pesan') {
            await bot.sendMessage(chatId, 'Silakan pilih menu yang ingin dipesan 😊', {
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

        if (menu[data]) {
            const item = menu[data];
            await bot.sendMessage(chatId,
`🧾 **PESANAN ANDA**

Menu: ${item.nama}
Harga: Rp${item.harga.toLocaleString('id-ID')}

Ketik format berikut untuk order:
Nama - Jumlah

Contoh:
Budi - 2`,
                { parse_mode: 'Markdown' }
            );
        }

        if (data === 'info') {
            await bot.sendMessage(chatId,
`📍 **Lokasi:**
Jl. Sudirman No. 123, Jakarta

🕒 **Jam Operasional:**
Setiap hari 10.00 - 22.00`,
                { parse_mode: 'Markdown' }
            );
        }

        if (data === 'cs') {
            await bot.sendMessage(chatId, '📞 Hubungi Admin: @adminresto');
        }

        await bot.answerCallbackQuery(query.id);
    } catch (err) {
        console.error('Error di callback_query:', err.message);
    }
});

// HANDLE ORDER TEXT
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();

    if (!text || text.startsWith('/')) return;

    if (text.includes('-')) {
        const [nama, jumlahStr] = text.split('-').map(t => t.trim());
        const jumlah = parseInt(jumlahStr);

        if (!nama || isNaN(jumlah) || jumlah <= 0) {
            return bot.sendMessage(chatId, 'Format salah ya Kak 😅\nContoh: Budi - 2');
        }

        bot.sendMessage(chatId,
`✅ **PESANAN DITERIMA**

Nama: ${nama}
Jumlah: ${jumlah}

Pesanan sedang diproses ya Kak 🍽️
Terima kasih banyak 🙏`,
            { parse_mode: 'Markdown' }
        );
    }
});

// WEBHOOK ENDPOINT
app.post(webhookPath, (req, res) => {
    console.log('Webhook menerima update dari Telegram');
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`🚀 Server berjalan di port ${PORT}`);

    const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
    if (domain) {
        // Bersihkan webhook lama dulu
        try {
            await bot.deleteWebHook();
            console.log('Webhook lama dihapus');
        } catch (e) {
            console.log('Tidak ada webhook lama atau gagal delete:', e.message);
        }

        // Pastikan URL bersih (tanpa trailing slash ekstra)
        let cleanDomain = domain.endsWith('/') ? domain.slice(0, -1) : domain;
        const webhookUrl = `https://${cleanDomain}${webhookPath}`;

        try {
            await bot.setWebHook(webhookUrl, {
                allowed_updates: ['message', 'callback_query'] // Lebih efisien
            });
            console.log(`✅ Webhook berhasil diset ke: ${webhookUrl}`);
        } catch (err) {
            console.error('❌ Gagal set webhook:', err.message);
            console.log('Fallback: mulai polling mode...');
            bot.startPolling({ drop_pending_updates: true });
        }
    } else {
        console.log('Domain Railway tidak ditemukan → mulai polling...');
        bot.startPolling({ drop_pending_updates: true });
    }
});
