// File: api/products.js

export default async function handler(req, res) {
    // Keamanan: Hanya izinkan request GET (Read-Only)
    if (req.method !== 'GET') {
        return res.status(405).json({ error: "Method Not Allowed. API ini hanya untuk membaca data." });
    }

    const BIN_ID = process.env.JSONBIN_BIN_ID;
    const API_KEY = process.env.JSONBIN_API_KEY;

    if (!BIN_ID || !API_KEY) {
        return res.status(500).json({ error: "Konfigurasi API Key atau Bin ID hilang di server." });
    }

    try {
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

        // PROSES FILTERING & KATEGORISASI (Tanpa Beban Gambar)
        const publicProducts = inventoryItems
            .filter(item => item.status === "stok") // Mutlak: Hanya ambil yang "stok"
            .map(item => {
                const nameLower = item.name.toLowerCase();
                let deviceCategory = "Aksesoris";
                
                // Logika Kamus Kategori Otomatis
                if (nameLower.match(/macbook|laptop|notebook|chromebook|asus|acer|lenovo|hp|msi|axioo|zyrex/)) {
                    deviceCategory = "Laptop";
                } else if (nameLower.match(/iphone|ipad|apple/)) {
                    deviceCategory = "Apple";
                } else if (nameLower.match(/samsung|galaxy|xiaomi|poco|redmi|oppo|vivo|realme|infinix|tecno|techno|itel|note|reno|spark|pixel/)) {
                    deviceCategory = "Android";
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
                    kondisi_barang: item.type === "new" ? "Baru (BNOB)" : "Second Prima"
                };
            });

        // Cache 10 detik untuk performa super cepat
        res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
        
        // Kirim data bersih dan super ringan ke pengunjung
        res.status(200).json(publicProducts);
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Gagal memuat katalog produk." });
    }
}
