import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function testLinkIntent() {
    const secretKey = process.env.FINTOC_API_KEY;
    console.log('Testing Create Link Intent...');
    console.log('Secret Key starts with:', secretKey?.substring(0, 10));

    // Test 1: without webhook_url
    try {
        const res = await axios.post(
            'https://api.fintoc.com/v1/link_intents',
            { product: 'movements', country: 'cl', holder_type: 'individual' },
            { headers: { Authorization: secretKey } }
        );
        console.log('✅ Link Intent (no webhook):', JSON.stringify(res.data, null, 2));
    } catch (e: any) {
        console.log('❌ Link Intent (no webhook) failed:');
        console.log('Status:', e.response?.status);
        console.log('Data:', JSON.stringify(e.response?.data, null, 2));
    }

    // Test 2: with webhook_url
    try {
        const res = await axios.post(
            'https://api.fintoc.com/v1/link_intents',
            {
                product: 'movements',
                country: 'cl',
                holder_type: 'individual',
                webhook_url: 'https://webhook.site/test'
            },
            { headers: { Authorization: secretKey } }
        );
        console.log('✅ Link Intent (with webhook):', JSON.stringify(res.data, null, 2));
    } catch (e: any) {
        console.log('❌ Link Intent (with webhook) failed:');
        console.log('Status:', e.response?.status);
        console.log('Data:', JSON.stringify(e.response?.data, null, 2));
    }
}

testLinkIntent();
