// File: Pretest/BulkSubmitTest.js (ฉบับแก้ไขที่ถูกต้อง)

const express = require('express');

module.exports = (supabase, authenticateToken) => {
  const router = express.Router();

  router.post('/bulk-submittest', authenticateToken, async (req, res) => {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อน' });
    }

    const { quizz_id, answers } = req.body;
    if (!quizz_id || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง' });
    }

    try {
      let totalScore = 0;
      const questionIds = answers.map(a => a.question_id);

      if (questionIds.length === 0) {
        return res.status(200).json({ message: 'ไม่มีคำตอบที่ต้องบันทึก', score: 0, totalQuestions: 0 });
      }

      // 1. ดึงคำตอบที่ถูกต้องทั้งหมด (เหมือนเดิม)
      const [
        { data: correctTextAnswers, error: textError },
        { data: correctMatchAnswers, error: matchError }
      ] = await Promise.all([
        supabase.from('answertext_instrument').select('question_id, answer_text').in('question_id', questionIds).eq('is_correct', true),
        supabase.from('answermatch_instrument').select('questiontext_id, answermatch_prompt, answermatch_response').in('questiontext_id', questionIds)
      ]);

      if (textError) throw new Error(`ไม่สามารถโหลดคำตอบปรนัยได้: ${textError.message}`);
      if (matchError) throw new Error(`ไม่สามารถโหลดคำตอบจับคู่ได้: ${matchError.message}`);
      
      // ✅ [ แก้ไขส่วนนี้ ] - สร้าง Map ที่เก็บ Set ของคำตอบที่ถูกต้อง
      const correctTextMap = new Map();
      for (const ans of correctTextAnswers) {
        if (!correctTextMap.has(ans.question_id)) {
          correctTextMap.set(ans.question_id, new Set()); // สร้าง Set ใหม่ถ้ายังไม่มี
        }
        // เพิ่มคำตอบที่ถูกต้องเข้าไปใน Set (ใช้ toLowerCase เพื่อให้เทียบง่าย)
        correctTextMap.get(ans.question_id).add(ans.answer_text.trim().toLowerCase());
      }
      
      // ส่วนของ Matching question ยังเหมือนเดิม
      const correctMatchMap = new Map();
      correctMatchAnswers.forEach(ans => {
        if (!correctMatchMap.has(ans.questiontext_id)) correctMatchMap.set(ans.questiontext_id, {});
        correctMatchMap.get(ans.questiontext_id)[ans.answermatch_prompt] = ans.answermatch_response;
      });

      const userAnswersToUpsert = [];
      for (const userAnswer of answers) {
        let isCorrect = false;
        const { question_id, selected_answer } = userAnswer;
        
        if (typeof selected_answer === 'string') {
          // ✅ [ แก้ไขส่วนนี้ ] - ตรวจสอบว่าคำตอบที่ผู้ใช้เลือก อยู่ใน Set ของคำตอบที่ถูกต้องหรือไม่
          const correctSet = correctTextMap.get(question_id);
          if (correctSet) {
            isCorrect = correctSet.has(selected_answer.trim().toLowerCase());
          }
        } else if (typeof selected_answer === 'object' && selected_answer !== null) {
          // Logic ของ Matching question ยังเหมือนเดิม
          const correctPairs = correctMatchMap.get(question_id);
          if (correctPairs) {
            const userSelectedPairs = Object.entries(selected_answer);
            isCorrect = 
              userSelectedPairs.length > 0 &&
              userSelectedPairs.length === Object.keys(correctPairs).length &&
              userSelectedPairs.every(([prompt, response]) => correctPairs[prompt] === response);
          }
        }
        
        if (isCorrect) totalScore++;

        userAnswersToUpsert.push({
          user_id: userId,
          question_id: question_id,
          selected_answer: selected_answer,
          is_correct: isCorrect,
          score: isCorrect ? 1 : 0
        });
      }

      // การเรียก RPC ยังเหมือนเดิม ถูกต้องแล้ว
      const { error: rpcError } = await supabase.rpc('bulk_upsert_user_answers', {
        answers: userAnswersToUpsert
      });

      if (rpcError) {
        console.error('Supabase RPC Error in /bulk-submittest:', JSON.stringify(rpcError, null, 2));
        throw new Error(`บันทึกคำตอบไม่สำเร็จ: ${rpcError.message}`);
      }
      
      return res.status(200).json({
        message: 'ส่งคำตอบทั้งหมดสำเร็จ',
        score: totalScore,
        totalQuestions: answers.length,
      });

    } catch (err) {
      console.error('❌ Error in /bulk-submittest:', err.message);
      return res.status(500).json({ message: err.message || 'เกิดข้อผิดพลาดในการบันทึกคำตอบ' });
    }
  });

  return router;
};