// File: Pretest/AnswerTexts.js

const express = require('express');
const router = express.Router();

module.exports = (supabase) => {
  router.get('/answertexts', async (req, res) => {
    const { instrument_id, quizz_id } = req.query;

    if (!instrument_id || !quizz_id) {
      return res.status(400).json({ status: 'error', message: 'กรุณาระบุ instrument_id และ quizz_id' });
    }

    try {
      const parsedInstrumentId = Number(instrument_id);
      const parsedQuizzId = Number(quizz_id);

      // ตรวจสอบว่า quizz_id ที่ส่งมานั้นถูกต้องและอยู่ใน instrument ที่ระบุ
      const { data: quizzes, error: quizError } = await supabase
        .from('quizz_instrument')
        .select('quizz_id')
        .eq('instrument_id', parsedInstrumentId)
        .eq('quizz_id', parsedQuizzId);

      if (quizError) throw new Error(`Supabase Error (quizz lookup): ${quizError.message}`);
      if (!quizzes || quizzes.length === 0) {
        return res.status(404).json({ status: 'error', message: 'ไม่พบแบบทดสอบที่เชื่อมกับ instrument นี้' });
      }

      const quizzIds = quizzes.map(q => q.quizz_id);

      // ดึงข้อมูลคำถามพร้อมกับประเภทคำถาม (questiontype)
      const { data: questions, error: questionError } = await supabase
        .from('questiontext_instrument')
        .select(`
          questiontext_id,
          question_text,
          quizz_id,
          questiontype_instrument (
            questiontype_id,
            questiontype_name
          )
        `)
        .in('quizz_id', quizzIds);

      if (questionError) throw new Error(`Supabase Error (questions): ${questionError.message}`);
      if (!questions || questions.length === 0) {
        return res.status(404).json({ status: 'error', message: 'ไม่พบคำถามสำหรับ instrument นี้' });
      }

      const questionIds = questions.map(q => q.questiontext_id);

      // ดึงข้อมูล media, choice, และ matching ทั้งหมดในครั้งเดียว
      const [
        { data: media, error: mediaError },
        { data: answers, error: answerError },
        { data: matches, error: matchError }
      ] = await Promise.all([
        supabase.from('questionmedia_instrument').select('questionstext_id, questionmedia_image, questionmedia_audio').in('questionstext_id', questionIds),
        supabase.from('answertext_instrument').select('question_id, answer_text').in('question_id', questionIds),
        supabase.from('answermatch_instrument').select('questiontext_id, answermatch_prompt, answermatch_response').in('questiontext_id', questionIds)
      ]);

      if (mediaError) throw new Error(`Supabase Error (media): ${mediaError.message}`);
      if (answerError) throw new Error(`Supabase Error (answers): ${answerError.message}`);
      if (matchError) throw new Error(`Supabase Error (matches): ${matchError.message}`);
      
      // แก้ไขตรงนี้: mediaMap เป็น array
      const mediaMap = new Map();
      media.forEach(item => {
        if (!mediaMap.has(item.questionstext_id)) mediaMap.set(item.questionstext_id, []);
        mediaMap.get(item.questionstext_id).push(item);
      });

      const answersMap = new Map();
      answers.forEach(a => {
        if (!answersMap.has(a.question_id)) answersMap.set(a.question_id, []);
        answersMap.get(a.question_id).push(a.answer_text);
      });
      const matchesMap = new Map();
      matches.forEach(m => {
        if (!matchesMap.has(m.questiontext_id)) matchesMap.set(m.questiontext_id, []);
        matchesMap.get(m.questiontext_id).push({ left: m.answermatch_prompt, right: m.answermatch_response });
      });

      // ส่ง media_list (array) กลับไป
      const merged = questions.map(q => {
        const questionMediaList = mediaMap.get(q.questiontext_id) || [];
        const questionOptions = answersMap.get(q.questiontext_id) || [];
        const questionMatches = matchesMap.get(q.questiontext_id) || [];

        return {
          id: q.questiontext_id,
          question_text: q.question_text,
          question_type_name: q.questiontype_instrument?.questiontype_name || 'ไม่ระบุ',
          question_type_id: q.questiontype_instrument?.questiontype_id || 0,
          // ส่ง media_list เป็น array
          media_list: questionMediaList.map(m => ({
            image_url: m.questionmedia_image,
            audio_url: m.questionmedia_audio
          })),
          // สำหรับ backward compatibility
          questionmedia_image: questionMediaList[0]?.questionmedia_image || null,
          questionmedia_audio: questionMediaList[0]?.questionmedia_audio || null,
          options: questionOptions,
          matches: questionMatches.length > 0 ? questionMatches : null
        };
      });

      return res.status(200).json({ status: 'success', data: merged });
    } catch (err) {
      console.error('❌ Unexpected Server Error in /answertexts:', err);
      return res.status(500).json({ status: 'error', message: err.message || 'เกิดข้อผิดพลาด' });
    }
  });

  return router;
};