// File: Posttest/CheckCompletion.js

const express = require('express');
const router = express.Router();

module.exports = (supabase, authenticateToken) => {
  
  // ✅ เปลี่ยนชื่อ endpoint
  router.get('/check-posttest-complete', authenticateToken, async (req, res) => {
    const userId = req.user?.sub;
    const { instrument_id, quizz_id } = req.query;

    if (!instrument_id || !quizz_id) {
      return res.status(400).json({ message: 'กรุณาระบุ instrument_id และ quizz_id' });
    }

    try {
      const { data: quizz, error: quizError } = await supabase
        .from('quizz_instrument')
        .select('quizz_id')
        .eq('instrument_id', instrument_id)
        .eq('quizz_id', quizz_id)
        .maybeSingle();

      if (quizError) throw new Error(`Error fetching quiz: ${quizError.message}`);

      if (!quizz) {
        return res.status(404).json({
          completed: false,
          message: 'ไม่พบแบบทดสอบที่ตรงกับ instrument และ quiz ที่ระบุ',
          answeredCount: 0,
          totalQuestions: 0,
        });
      }

      const { data: questions, error: questionError } = await supabase
        .from('questiontext_instrument') 
        .select('questiontext_id')      
        .eq('quizz_id', quizz.quizz_id);

      if (questionError) throw new Error(`Error fetching questions: ${questionError.message}`);
      
      const questionIds = questions.map(q => q.questiontext_id);
      const totalQuestions = questionIds.length;
      
      if (totalQuestions === 0) {
        return res.status(200).json({
          completed: true,
          answeredCount: 0,
          totalQuestions: 0,
        });
      }

      const { count: answeredCount, error: answerError } = await supabase
        .from('user_answer')
        .select('question_id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('question_id', questionIds);

      if (answerError) throw new Error(`Error fetching user answers: ${answerError.message}`);
      
      const completed = answeredCount === totalQuestions;

      return res.status(200).json({
        completed,
        answeredCount,
        totalQuestions,
      });

    } catch (err) {
      // ✅ เปลี่ยนข้อความ error log
      console.error('❌ Unexpected server error in /check-posttest-complete:', err.message);
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
    }
  });

  return router;
};