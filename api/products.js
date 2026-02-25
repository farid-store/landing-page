// File: api/products.js

export default async function handler(req, res) {
    // Membatasi agar API ini hanya melayani request GET (Read-Only)
    if (req.method !== 'GET') {
        return res.status(405).json({ error: "Method Not Allowed. API ini hanya untuk membaca data." });
    }

    const BIN_ID = process.env.JSONBIN_BIN_ID;
    const API_KEY = process.env.JSONBIN_API_KEY;

    if (!BIN_ID || !API_KEY) {
        return res.status(500).json({ error: "Konfigurasi API Key hilang." });
    }

    try {
        // Mengambil data dari JSONBin (HANYA MEMBACA)
        const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            method: 'GET',
            headers: {
                'X-Master-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Gagal mengambil data dari database utama");

        const data = await response.json();
        const inventoryItems = data.record.items || [];

        // Fungsi pintar untuk menentukan gambar otomatis berdasarkan nama barang
        const getAutoImage = (productName) => {
            const nameLower = productName.toLowerCase();
            
            if (nameLower.includes('iphone') || nameLower.includes('apple')) {
                return "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&q=80"; // Gambar iPhone
            } else if (nameLower.includes('samsung') || nameLower.includes('galaxy')) {
                return "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80"; // Gambar Samsung
            } else if (nameLower.includes('poco') || nameLower.includes('xiaomi') || nameLower.includes('redmi') || nameLower.includes('note')) {
                return "https://images.unsplash.com/photo-1598327105666-5b89351cb315?w=800&q=80"; // Gambar Xiaomi/Poco
            } else if (nameLower.includes('oppo') || nameLower.includes('reno')) {
                return "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&q=80"; // Gambar Android Elegan (Oppo)
            } else if (nameLower.includes('vivo') || nameLower.includes('infinix') || nameLower.includes('techno')) {
                return "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&q=80"; // Gambar Android Modern Lainnya
            } else {
                return "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80"; // Gambar Gadget Default
            }
        };

        // PROSES FILTERING: Membuang data sensitif dan merapikan format
        const publicProducts = inventoryItems
            .filter(item => item.status === "stok") // HANYA AMBIL YANG BERSTATUS "stok"
            .map(item => {
                const formatRupiah = new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0
                }).format(item.price);

                return {
                    id: item.id,
                    nama: item.name,
                    harga: formatRupiah,
                    kategori: item.type === "new" ? "Baru" : "Second",
                    kondisi: item.type === "new" ? "BNOB / Mulus" : "Kondisi Prima",
                    gambar: getAutoImage(item.name) // Eksekusi gambar otomatis
                };
            });

        // Set Cache-Control agar web cepat diakses tapi tetap update tiap 10 detik
        res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
        
        // Kirim data yang sudah 100% aman ke pengunjung
        res.status(200).json(publicProducts);
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Gagal memuat katalog produk." });
    }
}
