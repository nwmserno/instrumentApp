// File: Pretest/SubmitTest.js

const express = require('express');

module.exports = (supabase, authenticateToken) => {
  const router = express.Router();

  // Endpoint สำหรับการส่งคำตอบทีละข้อ (อาจไม่ได้ใช้แล้วถ้าใช้ bulk submit ตลอด)
  router.post('/Submittest', authenticateToken, async (req, res) => {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อน' });
    }

    const { question_id, selected_answer } = req.body;
    if (question_id == null || selected_answer == null) {
      return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน' });
    }

    try {
      // ดึงคำตอบที่ถูกต้องเพื่อใช้ในการเปรียบเทียบ
      const { data: correctAnswers, error } = await supabase
        .from('answertext_instrument')
        .select('answer_text')
        .eq('question_id', question_id)
        .eq('is_correct', true);

      if (error) throw new Error(`Supabase fetch error: ${error.message}`);
      if (!correctAnswers || correctAnswers.length === 0) {
        return res.status(404).json({ message: 'ไม่พบคำตอบที่ถูกต้องสำหรับคำถามนี้' });
      }

      // ตรวจสอบคำตอบ
      const isCorrect = correctAnswers.some(ans =>
        ans.answer_text.trim().toLowerCase() === selected_answer.trim().toLowerCase()
      );

      // ✅ [ ถูกต้องแล้ว ] เรียกใช้ฟังก์ชัน RPC upsert_user_answer
      // ซึ่งเป็นวิธีที่ถูกต้องและจะไม่เกิดปัญหาเรื่อง timestamp
      const { error: rpcError } = await supabase.rpc('upsert_user_answer', {
        p_user_id: userId,
        p_question_id: question_id,
        p_selected_answer: selected_answer, // selected_answer สามารถเป็น string หรือ object ก็ได้ เพราะ column เป็น jsonb
        p_is_correct: isCorrect,
        p_score: isCorrect ? 1 : 0
      });

      if (rpcError) {
        throw new Error(`Supabase RPC error: ${rpcError.message}`);
      }

      return res.status(200).json({
        message: 'ส่งคำตอบสำเร็จ',
        is_correct: isCorrect,
      });

    } catch(err) {
      console.error("❌ Error in /Submittest:", err.message);
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกคำตอบ' });
    }
  });

  return router;
};