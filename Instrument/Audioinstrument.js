// AudioInstrument.js (ฉบับแก้ไข)
const express = require('express');
const router = express.Router();

module.exports = (supabase) => {
  // เปลี่ยน Endpoint ให้รับ instrumentId และ note
  // GET /audio/:instrumentId/:note
  router.get('/:instrumentId/:note', async (req, res) => {
    // รับค่าจาก params ทั้งสองตัว
    const instrumentId = req.params.instrumentId;
    const note = req.params.note;

    // ตรวจสอบว่าได้ค่าครบหรือไม่
    if (!instrumentId || !note) {
      return res.status(400).json({ error: 'Instrument ID and note are required' });
    }

    // แก้ไขคำสั่ง query ให้ค้นหาจาก cả instrumentId และ audio_name
    const { data, error } = await supabase
      .from('audio_instrument')
      .select('audio_address')
      .eq('thaiinstrument_id', instrumentId) // ค้นหาด้วย ID ของเครื่องดนตรี
      .eq('audio_name', note)               // และค้นหาด้วยชื่อโน้ต
      .single();

    if (error || !data) {
      console.error('Error fetching audio:', error);
      return res.status(404).json({ error: 'Audio not found for the specified instrument and note' });
    }

    return res.json({ url: data.audio_address });
  });

  return router;
};