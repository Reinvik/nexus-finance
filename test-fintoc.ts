
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testFintoc() {
    console.log('--- Testing Fintoc API Key ---');
    const apiKey = process.env.FINTOC_API_KEY;

    if (!apiKey) {
        console.log('❌ FINTOC_API_KEY not found in .env');
        return;
    }

    try {
        // Try to list links (simplest authorized request)
        const response = await axios.get('https://api.fintoc.com/v1/links', {
            headers: { 'Authorization': apiKey }
        });
        console.log('✅ Fintoc Connection: Success');
        console.log('Links found:', response.data.length);
    } catch (e: any) {
        console.log('❌ Fintoc Connection: Failed');
        if (e.response) {
            console.log('Status:', e.response.status);
            console.log('Data:', JSON.stringify(e.response.data));
        } else {
            console.log('Error:', e.message);
        }
    }
}

testFintoc();
