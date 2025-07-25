// routes/authRoutes.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports = (supabase) => {
  const router = express.Router();

  router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!username || !password) {
      return res.status(400).json({ status: 'error', message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }

    const { data: user, error } = await supabase
      .from('user')
      .select('user_id, username, password')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ status: 'error', message: 'ไม่พบชื่อผู้ใช้นี้ในระบบ' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ status: 'error', message: 'รหัสผ่านไม่ถูกต้อง' });
    }

    const token = jwt.sign(
      {
        sub: user.user_id, // ✅ ใช้เป็น sub ตามมาตรฐาน
        username: user.username,
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      status: 'success',
      message: 'ล็อกอินสำเร็จ',
      user_id: user.user_id,
      username: user.username,
      token,
    });
  });

  return router;
};
