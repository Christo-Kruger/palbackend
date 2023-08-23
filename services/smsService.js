const axios = require('axios');
const crypto = require('crypto');


const sendSMS = async (phoneNumber, message) => {
  const url = `https://sens.apigw.ntruss.com/sms/v2/services/${process.env.SERVICE_ID}/messages`;
  const timestamp = Date.now().toString(); // Get current Unix timestamp

  // Generate the signature
  const method = 'POST';
  const uri = `/sms/v2/services/${process.env.SERVICE_ID}/messages`;
  const accessKey = process.env.ACCESS_KEY;
  const secretKey = process.env.SECRET_KEY;
  const messageToSign = [method, ' ', uri, '\n', timestamp, '\n', accessKey].join('');
  const signature = crypto.createHmac('sha256', secretKey).update(messageToSign).digest('base64');


  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'x-ncp-apigw-timestamp': timestamp,
    'x-ncp-iam-access-key': accessKey,
    'x-ncp-apigw-signature-v2': signature,
  };

  
  
  const data = {
    type: 'LMS',
    contentType: 'COMM',
    countryCode: '82',
    from: process.env.SENDER_PHONE_NUMBER,
    content: message,
    messages: [
      {
        to: phoneNumber,
      },
    ],
  };

  try {
    const response = await axios.post(url, data, { headers });
    console.log('Response from Naver Cloud SMS:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending SMS:', error.response.data);
    throw error;
  }
};

module.exports = { sendSMS };
