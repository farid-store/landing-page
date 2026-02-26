// File: api/products.js

export default async function handler(req, res) {
    // Keamanan: Hanya izinkan request GET (Read-Only)
    if (req.method !== 'GET') {
        return res.status(405).json({ error: "Method Not Allowed. API ini hanya untuk membaca data." });
    }

    // Mengambil kunci rahasia dari Environment Variables Vercel
    const BIN_ID = process.env.JSONBIN_BIN_ID;
    const API_KEY = process.env.JSONBIN_API_KEY;

    if (!BIN_ID || !API_KEY) {
        return res.status(500).json({ error: "Konfigurasi API Key atau Bin ID hilang di server." });
    }

    try {
        // Mengambil data mentah dari JSONBin Anda
        const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            method: 'GET',
            headers: {
                'X-Master-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Gagal mengambil data dari database utama");

        const data = await response.json();
        
        // Mengambil array "items" dari format JSON Anda
        const inventoryItems = data.record.items || [];

        // PROSES FILTERING & KATEGORISASI PINTAR
        const publicProducts = inventoryItems
            // 1. Mutlak: Hanya ambil barang yang statusnya "stok"
            .filter(item => item.status === "stok")
            // 2. Format ulang data untuk dikirim ke landing page
            .map(item => {
                const nameLower = item.name.toLowerCase();
                let deviceCategory = "Aksesoris";
                let imgUrl = "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80"; // Default
                
                // Logika Kamus Kategori Otomatis
                if (nameLower.match(/macbook|laptop|notebook|chromebook|asus|acer|lenovo|hp|msi|axioo|zyrex/)) {
                    deviceCategory = "Laptop";
                    imgUrl = "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80";
                } else if (nameLower.match(/iphone|ipad|apple/)) {
                    deviceCategory = "Apple";
                    imgUrl = "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&q=80";
                } else if (nameLower.match(/samsung|galaxy|xiaomi|poco|redmi|oppo|vivo|realme|infinix|tecno|techno|itel|note|reno|spark|pixel/)) {
                    deviceCategory = "Android";
                    if (nameLower.includes('samsung')) {
                        imgUrl = "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80";
                    } else if (nameLower.match(/oppo|vivo|realme/)) {
                        imgUrl = "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&q=80";
                    } else {
                        imgUrl = "https://images.unsplash.com/photo-1598327105666-5b89351cb315?w=800&q=80";
                    }
                }

                // Format Harga ke Rupiah
                const formatRupiah = new Intl.NumberFormat('id-ID', {
                    style: 'currency', 
                    currency: 'IDR', 
                    minimumFractionDigits: 0
                }).format(item.price);

                return {
                    id: item.id,
                    nama: item.name,
                    harga: formatRupiah,
                    kategori_device: deviceCategory,
                    kondisi_barang: item.type === "new" ? "Baru (BNOB)" : "Second Prima",
                    gambar: imgUrl
                };
            });

        // Set Cache agar web ngebut, tapi tetap update setiap 10 detik jika ada perubahan
        res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
        
        // Kirim data yang sudah aman ke pengunjung
        res.status(200).json(publicProducts);
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Gagal memuat katalog produk." });
    }
}
