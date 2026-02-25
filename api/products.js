// File: api/products.js

export default async function handler(req, res) {
    // Mengambil environment variables dari Vercel
    const BIN_ID = process.env.JSONBIN_BIN_ID;
    const API_KEY = process.env.JSONBIN_API_KEY;

    // Pastikan variabel environment sudah diatur di Vercel
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

        if (!response.ok) {
            throw new Error(`Error dari JSONBin: ${response.status}`);
        }

        const data = await response.json();
        
        // JSONBin v3 menyimpan data asli di dalam properti "record"
        res.status(200).json(data.record);
    } catch (error) {
        console.error("Gagal mengambil data:", error);
        res.status(500).json({ error: "Gagal memuat produk dari database." });
    }
}
