const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Hàm tự động cắt mã bài viết từ link Instagram
function extractMediaCode(url) {
    try {
        const regex = /(?:p|reel|tv)\/([A-Za-z0-9_-]+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
    } catch (e) {
        return null;
    }
}

app.post('/api/download', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'Vui lòng nhập link Instagram!' });
    }

    const mediaCode = extractMediaCode(url);
    
    if (!mediaCode) {
        return res.status(400).json({ error: 'Không tìm thấy mã bài viết. Vui lòng copy đúng link bài viết nhé!' });
    }

    try {
        const options = {
            method: 'GET',
            url: 'https://instagram-scraper-stable-api.p.rapidapi.com/get_media_data_v2.php',
            params: { media_code: mediaCode },
            headers: {
                'X-RapidAPI-Key': '53783b1327mshc5163a4f0e02be4p147252jsn653c7a6a1cbd', // Key gốc của bạn
                'X-RapidAPI-Host': 'instagram-scraper-stable-api.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        const hdImageUrl = response.data.thumbnail_src;

        if (hdImageUrl) {
            res.json({ success: true, hd_url: hdImageUrl });
        } else {
            res.status(404).json({ error: 'Không tìm thấy ảnh HD trong bài viết này.' });
        }

    } catch (error) {
        console.error("Lỗi:", error.message);
        res.status(500).json({ error: 'Không thể kết nối đến máy chủ Instagram. Hãy thử lại!' });
    }
});

// TÍNH NĂNG MỚI: ĐƯỜNG HẦM VƯỢT RÀO (Chống vỡ ảnh & Hỗ trợ tải thẳng về máy)
app.get('/api/proxy', async (req, res) => {
    try {
        const imageUrl = req.query.url;
        if (!imageUrl) return res.status(400).send('Thiếu link ảnh');

        const response = await axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'stream',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.instagram.com/'
            }
        });

        res.setHeader('Content-Type', response.headers['content-type']);
        response.data.pipe(res);
    } catch (error) {
        res.status(500).send('Lỗi khi qua mặt Instagram');
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy ngon lành tại http://localhost:${PORT}`);
});