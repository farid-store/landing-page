// File: api/products.js

export default async function handler(req, res) {
    // Keamanan: Hanya izinkan request GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: "Method Not Allowed." });
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
                'X-Bin-Meta': 'false', // Mengambil data murni tanpa metadata JSONBin
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Gagal mengambil data dari JSONBin");

        const data = await response.json();
        
        // Data di JSONBin biasanya dibungkus dalam properti 'record' jika meta true, 
        // tapi jika X-Bin-Meta false, langsung ke isi objeknya.
        // Kita handle kedua kemungkinan agar aman:
        const rawItems = data.items || (data.record && data.record.items) || [];

        // REVISI LOGIKA: Jangan membuang data "sold" di sini, 
        // karena Frontend membutuhkannya untuk menghitung "Trust/Sales Stats".
        const processedProducts = rawItems.map(item => {
            const nameLower = (item.name || "").toLowerCase();
            let deviceCategory = "Aksesoris";
            
            // Logika Kamus Kategori Otomatis (Tetap Dipertahankan)
            if (nameLower.match(/macbook|laptop|notebook|chromebook|asus|acer|lenovo|hp|msi|axioo|zyrex/)) {
                deviceCategory = "Laptop";
            } else if (nameLower.match(/iphone|ipad|apple/)) {
                deviceCategory = "Apple";
            } else if (nameLower.match(/samsung|galaxy|xiaomi|poco|redmi|oppo|vivo|realme|infinix|tecno|techno|itel|note|reno|spark|pixel/)) {
                deviceCategory = "Android";
            }

            // Kembalikan struktur data asli agar tidak merusak fungsi .toLocaleString() dan filter di Frontend
            return {
                ...item, // Menyertakan id, name, price, status, type, entryDate, soldAt
                kategori_device: deviceCategory, // Menambah kategori hasil deteksi otomatis
                kondisi_barang: item.type === "new" ? "Baru (BNOB)" : "Second Prima"
            };
        });

        // Cache 10 detik agar tidak terkena limit rate JSONBin jika traffic tinggi
        res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
        
        // Kirim objek dengan property "items" sesuai ekspektasi fetchProducts() di HTML
        res.status(200).json({ items: processedProducts });
        
    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: "Gagal memuat katalog produk dari database." });
    }
}
