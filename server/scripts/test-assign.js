const http = require('http');

async function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('Logging in as technician...');
  const loginRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: 'technician@fsktm.um.edu.my',
    password: 'Tech123!'
  });

  const token = loginRes.data.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  console.log('Assigning device 37 to MRM (location 2) via locations update...');
  const locUpdate = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/locations/2',
    method: 'PUT',
    headers: authHeaders
  }, {
    name: 'Makmal Realiti Maya',
    code: 'MRM',
    capacity: 30,
    category: 'Specialized Lab',
    description: 'Virtual & Augmented Reality lab with HTC Vive and Oculus Quest rigs.',
    status: 'available',
    device_ids: [37]
  });

  console.log('Loc update response:', locUpdate.status, locUpdate.data?.success);

  // Check device 37
  const devCheck = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/devices/37',
    method: 'GET',
    headers: authHeaders
  });

  console.log('Device 37 after assignment:', {
    name: devCheck.data?.device?.name,
    location_id: devCheck.data?.device?.location_id,
    is_loanable: devCheck.data?.device?.is_loanable
  });
}

run().catch(console.error);
