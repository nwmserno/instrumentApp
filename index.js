require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

if (!supabaseUrl || !supabaseKey || !JWT_SECRET) {
  console.error("Missing environment variables: SUPABASE_URL, SUPABASE_KEY, or JWT_SECRET");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const authenticateToken = require('./middleware/authenticateToken');

const imageRoutes = require('./Instrument/Imageinstrument')(supabase);
const audioRoutes = require('./Instrument/Audioinstrument')(supabase);
const componentMediaRoutes = require('./Instrument/ComponentMedia')(supabase);
const loginRoutes = require('./Home/Login')(supabase);
const registerRoutes = require('./Home/Register')(supabase);
const getUserRoutes = require('./Profile/UserProfile')(supabase);
const updateProfileRoutes = require('./Profile/UpdateProfile')(supabase);
const checkEmailRoutes = require('./Resetpassword/CheckEmail')(supabase);
const resetPasswordRoutes = require('./Resetpassword/ResetPassword')(supabase);
const sendotpRoutes = require('./Otp/SendOtp')(supabase);
const verifyRoutes = require('./Otp/VerifyOtp')(supabase);
const submitAnswerRoutes = require('./Pretest/SubmitTest')(supabase, authenticateToken);
const resetAllSequencesRoutes = require('./ResetAllID')(supabase);
const userHistoryRoute = require('./TestHistory/Userhistory')(supabase);
const answerTextRoutes = require('./Pretest/AnswerText.js')(supabase); 
const bulkSubmitRouter = require('./Pretest/BulkSubmitTest')(supabase, authenticateToken);
const LearningRoutes = require('./Learning/InstrumentLearning')(supabase);
const pretestCheckCompletionRoutes = require('./Pretest/CheckCompletion')(supabase, authenticateToken);
const posttestCheckCompletionRoutes = require('./Posttest/CheckCompletion.js')(supabase, authenticateToken);


// --- Use Routes ---
app.use('/instruments', imageRoutes);
app.use('/audio', audioRoutes);
app.use('/auth', componentMediaRoutes);
app.use('/auth', loginRoutes);
app.use('/auth', registerRoutes);
app.use('/auth', getUserRoutes);
app.use('/auth', updateProfileRoutes);
app.use('/auth', resetPasswordRoutes);
app.use('/auth', sendotpRoutes);
app.use('/auth', verifyRoutes);
app.use('/auth', checkEmailRoutes);
app.use('/api', userHistoryRoute);
app.use('/api', answerTextRoutes); 
app.use('/api', submitAnswerRoutes);
app.use('/api', bulkSubmitRouter);
app.use('/api', LearningRoutes);
app.use('/api', pretestCheckCompletionRoutes);
app.use('/api', posttestCheckCompletionRoutes);

app.use('/api', resetAllSequencesRoutes);


app.get('/', (req, res) => {
  res.send('Welcome to the API!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});