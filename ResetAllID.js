const express = require('express');
const router = express.Router();

module.exports = (supabase) => {
  router.post('/admin/reset-all-sequences', async (req, res) => {
    try {
      const { error } = await supabase.rpc('reset_all_sequences');

      if (error) {
        console.error('Supabase RPC error:', error);
        return res.status(500).json({ status: 'error', message: 'Reset ไม่สำเร็จ', detail: error.message });
      }

      return res.status(200).json({ status: 'success', message: 'Reset Sequences สำเร็จแล้ว 🎉' });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.status(500).json({ status: 'error', message: 'Unexpected error', detail: err.message });
    }
  });

  return router;
};
