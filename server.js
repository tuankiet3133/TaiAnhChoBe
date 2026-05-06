const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

// Hàm lọc link cực sạch để lấy đúng mã post
function extractMediaCode(url) {
    try {
        const parts = url.split('/');
        const pIndex = parts.findIndex(p => p === 'p' || p === 'reel' || p === 'tv');
        return pIndex !== -1 ? parts[pIndex + 1] : null;
    } catch (e) { return null; }
}

app.post('/api/download', async (req, res) => {
    const { url } = req.body;
    const mediaCode = extractMediaCode(url);
    
    if (!mediaCode) return res.status(400).json({ error: 'Link không ổn rồi!' });

    try {
        const options = {
            method: 'GET',
            url: 'https://instagram-scraper-stable-api.p.rapidapi.com/get_media_data_v2.php',
            params: { media_code: mediaCode },
            headers: {
                'x-rapidapi-key': '4bc84badc3mshc6c4c4dd53508a8p1b4c46jsn42bfcd78188a', 
                'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        const data = response.data;

        // --- NHẬT KÝ PHỤC VỤ ANH THƯ ---
        console.log("\n=== KIỂM TRA DỮ LIỆU ===");
        console.log("Mã bài viết:", mediaCode);
        
        let images = [];

        // 1. ƯU TIÊN: Kiểm tra Sidecar (Cấu trúc Album 8 ảnh bạn vừa gửi)
        if (data.edge_sidecar_to_children && data.edge_sidecar_to_children.edges) {
            images = data.edge_sidecar_to_children.edges.map(edge => edge.node.display_url);
            console.log(`=> Đã tìm thấy album Sidecar: ${images.length} ảnh.`);
        } 
        // 2. Kiểm tra Carousel truyền thống
        else if (data.carousel_media && Array.isArray(data.carousel_media)) {
            images = data.carousel_media.map(item => {
                const v = item.image_versions2 || item.image_versions_2;
                return v ? v.candidates[0].url : item.thumbnail_src;
            });
            console.log(`=> Đã tìm thấy Carousel: ${images.length} ảnh.`);
        } 
        // 3. Nếu vẫn không thấy mảng, lấy ảnh đơn lẻ (display_url cao nhất hoặc thumbnail)
        else {
            const v = data.image_versions2 || data.image_versions_2;
            const single = v ? v.candidates[0].url : (data.display_url || data.thumbnail_src);
            if (single) images = [single];
            console.log(`=> Phát hiện ảnh đơn.`);
        }

        const finalImages = images.filter(u => u);

        if (finalImages.length > 0) {
            console.log(`=> Thành công! Gửi ${finalImages.length} ảnh cho Anh Thư.`);
            res.json({ success: true, images: finalImages });
        } else {
            res.status(404).json({ error: 'API trả về trống rỗng, thử link khác xem sao.' });
        }
    } catch (error) {
        console.error("Lỗi kết nối:", error.message);
        res.status(500).json({ error: 'Máy chủ Instagram đang chặn rồi!' });
    }
});

app.get('/api/proxy', async (req, res) => {
    try {
        const response = await axios({
            url: req.query.url, 
            method: 'GET', 
            responseType: 'stream',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 
                'Referer': 'https://www.instagram.com/' 
            }
        });
        res.setHeader('Content-Type', response.headers['content-type']);
        response.data.pipe(res);
    } catch (e) { 
        res.status(500).send('Lỗi proxy'); 
    }
});

app.listen(PORT, () => console.log(`🚀 Hệ thống phục vụ Anh Thư đã sẵn sàng: http://localhost:${PORT}`));