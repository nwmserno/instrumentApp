const express = require('express');
const router = express.Router();

module.exports = function(supabase) {
  router.get('/learning/:id', async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Valid Instrument ID is required' });
    }

    try {
      const { data, error } = await supabase
        .from('thai_instrument')
        .select(`
          thaiinstrument_name,
          learning_instrument (
            learning_name,
            learning_text,
            learningmedia_instrument (
              learningmedia_image,
              learningmedia_audio
            )
          )
        `)
        .eq('thaiinstrument_id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Instrument not found' });
        }
        throw error;
      }

      const responseData = {
        name: data.thaiinstrument_name,
        learning_topics: data.learning_instrument.map(item => ({
          learning_name: item.learning_name,
          learning_text: item.learning_text,
          media: item.learningmedia_instrument || [],
        })),
      };

      res.status(200).json(responseData);
    } catch (err) {
      console.error('Error fetching instrument learning details:', err.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  return router;
};
