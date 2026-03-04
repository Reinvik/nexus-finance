import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const FINTOC_SECRET_KEY = process.env.FINTOC_API_KEY;
async function check() {
  const res = await axios.get('https://api.fintoc.com/v1/links', {
    headers: { Authorization: FINTOC_SECRET_KEY }
  });
  console.log('Links response:', JSON.stringify(res.data, null, 2));
}
check();
