const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = process.env.TELEGRAM_TOKEN;

if (!token) {
    console.error('❌ TELEGRAM_TOKEN tidak ditemukan!');
    process.exit(1);
}

console.log('✅ Token OK, bot starting...');

const bot = new TelegramBot(token, { polling: false });

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

// Keranjang per user (Map<chatId, Map<itemKey, jumlah>>)
const carts = new Map();

// Fungsi helper hitung total keranjang
function getCartTotal(cart) {
    let total = 0;
    for (const [key, qty] of cart) {
        total += menu[key].harga * qty;
    }
    return total;
}

// Fungsi tampilkan keranjang
async function showCart(chatId) {
    const cart = carts.get(chatId) || new Map();
    if (cart.size === 0) {
        await bot.sendMessage(chatId, '🛒 Keranjang kamu masih kosong nih Kak 😅\nAyo pilih menu dulu!');
        return;
    }

    let text = '🛒 **Keranjang Belanja**\n\n';
    let total = 0;

    for (const [key, qty] of cart) {
        const item = menu[key];
        const subtotal = item.harga * qty;
        text += `${item.nama} x${qty} = Rp${subtotal.toLocaleString('id-ID')}\n`;
        total += subtotal;
    }

    text += `\n**Total: Rp${total.toLocaleString('id-ID')}**\n\n`;
    text += 'Mau lanjut pesan atau kosongkan?';

    await bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: "🛍️ Lanjut Pesan", callback_data: "pesan" }],
                [{ text: "🗑️ Kosongkan Keranjang", callback_data: "clear_cart" }]
            ]
        }
    });
}

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
                [{ text: "🛒 Lihat Keranjang", callback_data: "view_cart" }],
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
            await bot.sendMessage(chatId, 'Pilih menu yang ingin ditambahkan ke keranjang 😊', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🍛 Nasi Goreng", callback_data: "nasgor" }],
                        [{ text: "🍗 Ayam Bakar", callback_data: "ayam" }],
                        [{ text: "🍢 Sate Ayam", callback_data: "sate" }],
                        [{ text: "🍜 Mie Goreng", callback_data: "mie" }],
                        [{ text: "🥤 Es Teh", callback_data: "esteh" }],
                        [{ text: "🥑 Jus Alpukat", callback_data: "jus" }],
                        [{ text: "🛒 Lihat Keranjang", callback_data: "view_cart" }]
                    ]
                }
            });
        }

        // Tambah ke keranjang
        if (menu[data]) {
            let userCart = carts.get(chatId) || new Map();
            const currentQty = userCart.get(data) || 0;
            userCart.set(data, currentQty + 1);
            carts.set(chatId, userCart);

            const item = menu[data];
            await bot.sendMessage(chatId,
`✅ **Ditambahkan ke keranjang!**

${item.nama} x1 ditambahkan
Harga: Rp${item.harga.toLocaleString('id-ID')}

Mau tambah lagi atau lihat keranjang?`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "➕ Tambah Lagi Menu", callback_data: "pesan" }],
                            [{ text: "🛒 Lihat Keranjang", callback_data: "view_cart" }]
                        ]
                    }
                }
            );
        }

        if (data === 'view_cart') {
            await showCart(chatId);
        }

        if (data === 'clear_cart') {
            carts.delete(chatId);
            await bot.sendMessage(chatId, '🗑️ Keranjang sudah dikosongkan!\nMau pesan lagi? Tekan "Pesan Makanan" ya Kak 😊');
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
        console.error('Error callback:', err.message);
    }
});

// HANDLE TEXT (untuk konfirmasi nama customer atau pesan custom)
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();

    if (!text || text.startsWith('/')) return;

    // Contoh: kalau user ketik "Budi - 3" setelah lihat keranjang, anggap konfirmasi order
    if (text.includes('-')) {
        const [nama, jumlahStr] = text.split('-').map(t => t.trim());
        const jumlah = parseInt(jumlahStr);

        if (!nama || isNaN(jumlah) || jumlah <= 0) {
            return bot.sendMessage(chatId, 'Format konfirmasi salah 😅\nContoh: Budi - 3 (artinya pesan untuk Budi, total 3 porsi semua item)');
        }

        const cart = carts.get(chatId);
        if (!cart || cart.size === 0) {
            return bot.sendMessage(chatId, 'Keranjang kosong Kak, pesan dulu ya 😊');
        }

        let orderText = `✅ **ORDER DITERIMA!**\n\nNama: ${nama}\nTotal item: ${jumlah}\n\nDetail pesanan:\n`;
        let total = 0;

        for (const [key, qty] of cart) {
            const item = menu[key];
            const sub = item.harga * qty;
            orderText += `- ${item.nama} x${qty} = Rp${sub.toLocaleString('id-ID')}\n`;
            total += sub;
        }

        orderText += `\n**Total Bayar: Rp${total.toLocaleString('id-ID')}**\n\nPesanan diproses ya Kak, tunggu konfirmasi dari admin 🍽️ Terima kasih! 🙏`;

        bot.sendMessage(chatId, orderText, { parse_mode: 'Markdown' });

        // Kosongkan keranjang setelah order (atau bisa tunggu admin konfirmasi)
        carts.delete(chatId);
    }
});

// COMMAND /keranjang
bot.onText(/\/keranjang/, (msg) => {
    showCart(msg.chat.id);
});

// WEBHOOK
app.post(webhookPath, (req, res) => {
    console.log('Webhook menerima update');
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`🚀 Server jalan di port ${PORT}`);

    const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
    if (domain) {
        try {
            await bot.deleteWebHook();
            console.log('Webhook lama dihapus');
        } catch (e) {
            console.log('Tidak ada webhook lama:', e.message);
        }

        let cleanDomain = domain.endsWith('/') ? domain.slice(0, -1) : domain;
        const webhookUrl = `https://${cleanDomain}${webhookPath}`;

        try {
            await bot.setWebHook(webhookUrl, {
                allowed_updates: ['message', 'callback_query']
            });
            console.log(`✅ Webhook set: ${webhookUrl}`);
        } catch (err) {
            console.error('❌ Gagal set webhook:', err.message);
            console.log('Fallback ke polling...');
            bot.startPolling({ drop_pending_updates: true });
        }
    } else {
        console.log('Domain tidak ada → polling...');
        bot.startPolling({ drop_pending_updates: true });
    }
});
