// File: TestHistory/UserHistory.js
const express = require('express');

module.exports = (supabase) => {
  const router = express.Router();

  router.get('/username/:username', async (req, res) => {
    const { username } = req.params;
    console.log(">>> API HIT: /user-history/username/" + username);

    try {
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('user_id')
        .eq('username', username)
        .single();

      if (userError) throw new Error(userError.message);
      if (!userData) {
        return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้ที่ระบุ' });
      }
      const userId = userData.user_id;

      const { data, error } = await supabase
        .from('user_answer')
        .select(`
          user_id,
          question_id,
          selected_answer,
          is_correct,
          score,
          updated_at,
          questiontext_instrument (
            question_text,
            quizz_instrument (
              quizz_name,
              instrument_id
            )
          )
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Query error on user_answer:', error.message);
        throw error;
      }

      if (!data || data.length === 0) {
        return res.json({ success: true, data: [] });
      }

      const instrumentIds = [...new Set(
        data
          .map(d => d.questiontext_instrument?.quizz_instrument?.instrument_id)
          .filter(id => id != null)
      )];

      let instrumentData = [];
      if (instrumentIds.length > 0) {
        const { data: instruments, error: instError } = await supabase
          .from('thai_instrument')
          .select('thaiinstrument_id, thaiinstrument_name')
          .in('thaiinstrument_id', instrumentIds);

        if (instError) throw instError;
        instrumentData = instruments;
      }

      const instrumentMap = new Map(instrumentData.map(inst => [inst.thaiinstrument_id, inst.thaiinstrument_name]));

      const enrichedData = data.map(entry => {
        const instrumentId = entry.questiontext_instrument?.quizz_instrument?.instrument_id;
        const instrumentName = instrumentMap.get(instrumentId) ?? 'ไม่พบชื่อเครื่องดนตรี';
        return {
          ...entry,
          instrument_name: instrumentName,
        };
      });

      res.json({ success: true, data: enrichedData });
    } catch (err) {
      console.error('❌ Error in /user-history:', err.message);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
    }
  });

  return router;
};