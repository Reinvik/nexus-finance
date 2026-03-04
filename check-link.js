import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const FINTOC_SECRET_KEY = process.env.FINTOC_API_KEY;
async function check() {
  // Try to get a single link by its ID to see all fields
  const res = await axios.get('https://api.fintoc.com/v1/links/link_8Y0GD4i3bPyZG2be', {
    headers: { Authorization: FINTOC_SECRET_KEY }
  });
  console.log('Link detail:', JSON.stringify(res.data, null, 2));
}
check();
