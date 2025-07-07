const express = require('express');

module.exports = (supabase) => {
  const router = express.Router();

  // Test route to verify the router is working
  router.get('/test', (req, res) => {
    res.json({ 
      status: 'success', 
      message: 'Component Media router is working' 
    });
  });

  // GET /component-media/:instrumentId
  router.get('/component-media/:instrumentId', async (req, res) => {
    const { instrumentId } = req.params;
    
    console.log(`Received request for component media with instrument ID: ${instrumentId}`);

    if (!instrumentId || isNaN(instrumentId)) {
      console.log(`Invalid instrument ID: ${instrumentId}`);
      return res.status(400).json({ 
        status: 'error', 
        message: 'กรุณาระบุ instrument ID ที่ถูกต้อง' 
      });
    }

    try {
      console.log(`Querying componentmedia_instrument table for thaiinstrument_id: ${instrumentId}`);
      
      const { data, error } = await supabase
        .from('componentmedia_instrument')
        .select(`
          componentmedia_id,
          componentmedia_name,
          componentmedia_image,
          componentmedia_audio,
          thai_instrument (
            thaiinstrument_name
          )
        `)
        .eq('thaiinstrument_id', instrumentId)
        .order('componentmedia_id', { ascending: true });

      console.log(`Query result - data:`, data);
      console.log(`Query result - error:`, error);

      if (error) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูล component media:", error.message);
        return res.status(500).json({ 
          status: 'error', 
          message: error.message 
        });
      }

      if (!data || data.length === 0) {
        console.log(`No data found for instrument ID: ${instrumentId}`);
        return res.status(404).json({ 
          status: 'error', 
          message: 'ไม่พบข้อมูล component media สำหรับเครื่องดนตรีนี้' 
        });
      }

      console.log(`Successfully found ${data.length} component media items`);
      res.json({ 
        status: 'success', 
        data: data 
      });

    } catch (err) {
      console.error("Unexpected error:", err);
      return res.status(500).json({ 
        status: 'error', 
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' 
      });
    }
  });

  return router;
}; 