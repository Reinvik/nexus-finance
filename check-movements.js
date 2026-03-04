import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const FINTOC_SECRET_KEY = process.env.FINTOC_API_KEY;
const linkToken = 'link_8Y0GD4i3bPyZG2be_token_oeSa-WFy5Jn7HZs5zZhLY81W';
async function check() {
  // Page 1
  const res1 = await axios.get('https://api.fintoc.com/v1/accounts/acc_5pqWKkbTBLXmoaOV/movements', {
    headers: { Authorization: FINTOC_SECRET_KEY },
    params: { link_token: linkToken, per_page: 300, page: 1 }
  });
  console.log('Page 1 count:', res1.data.length);
  console.log('Headers:', JSON.stringify(Object.fromEntries(Object.entries(res1.headers).filter(([k]) => k.includes('cursor') || k.includes('page') || k.includes('total') || k.includes('next') || k.includes('link')))));
  
  // Try page 2
  const res2 = await axios.get('https://api.fintoc.com/v1/accounts/acc_5pqWKkbTBLXmoaOV/movements', {
    headers: { Authorization: FINTOC_SECRET_KEY },
    params: { link_token: linkToken, per_page: 300, page: 2 }
  });
  console.log('Page 2 count:', res2.data.length);
  
  // Show first and last dates on page 1
  console.log('First movement date:', res1.data[0]?.post_date, '| transaction_date:', res1.data[0]?.transaction_date);
  console.log('Last movement date:', res1.data[res1.data.length-1]?.post_date);
}
check();
