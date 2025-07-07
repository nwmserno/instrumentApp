const express = require('express');
const router = express.Router();

module.exports = (supabase) => {
  router.get('/user', async (req, res) => {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        status: 'error',
        message: 'กรุณาระบุชื่อผู้ใช้',
      });
    }

    try {
      const { data, error } = await supabase
        .from('user')
        .select('username, phone, email, age')
        .eq('username', username)
        .single();

      if (error || !data) {
        return res.status(404).json({
          status: 'error',
          message: 'ไม่พบผู้ใช้',
        });
      }

      return res.json({
        status: 'success',
        user: data,
      });

    } catch (err) {
      console.error('เกิดข้อผิดพลาดในการดึงข้อมูล:', err);
      return res.status(500).json({
        status: 'error',
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
      });
    }
  });

  return router;
};
