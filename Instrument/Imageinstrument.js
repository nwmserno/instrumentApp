const express = require('express');

module.exports = (supabase) => {
  const router = express.Router();

  router.get('/images', async (req, res) => {
    const { data, error } = await supabase
      .from('image_instrument')
      .select(`
        image_address,
        thai_instrument (
          thaiinstrument_name,
          thaiinstrument_type
        )
      `);

    if (error) {
      console.error("เกิดข้อผิดพลาดในการดึงข้อมูลรูปภาพ:", error.message);
      return res.status(500).json({ status: 'error', message: error.message });
    }

    res.json({ status: 'success', data });
  });

  return router;
};
