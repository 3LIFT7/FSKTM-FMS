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

  if (!loginRes.data?.token) {
    console.error('Failed to log in:', loginRes);
    return;
  }

  const token = loginRes.data.token;
  console.log('Logged in successfully!');

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 1. Move Cisco 2901 Router back to CISCO Lab (location_id: 31)
  console.log('Updating Cisco 2901 Router location to CISCO Lab (31)...');
  const updateRouter = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/devices/1',
    method: 'PUT',
    headers: authHeaders
  }, {
    name: 'Cisco 2901 Integrated Services Router',
    category: 'Networking',
    serial_number: 'RTR-CSC-2901',
    location_id: 31,
    is_loanable: false,
    specs: '2 GE Ports, 4 EHWIC Slots, 2 DSP Slots. Fixed Rack Unit.',
    status: 'available'
  });
  console.log('Update router result:', updateRouter.status, updateRouter.data?.success);

  // 2. Add devices for SAV (location_id: 4) and MRM (location_id: 2)
  const newDevices = [
    {
      name: 'Rode RodeCaster Pro II Audio Studio Console',
      category: 'Audio/Visual',
      serial_number: 'AUD-ROD-CP2',
      location_id: 4,
      specs: 'Integrated audio production studio, 4 XLR inputs, 8 motorized faders. Fixed Studio Console.',
      is_loanable: false,
      status: 'available'
    },
    {
      name: 'Blackmagic Studio Camera 4K Pro G2',
      category: 'Media',
      serial_number: 'CAM-BMD-ST4K',
      location_id: 4,
      specs: '12G-SDI, 7" HDR touchscreen, Micro Four Thirds mount. Fixed Studio Pedestal Camera.',
      is_loanable: false,
      status: 'available'
    },
    {
      name: 'Genelec 8030C Studio Monitors (Pair)',
      category: 'Audio/Visual',
      serial_number: 'SPK-GEN-8030',
      location_id: 4,
      specs: 'Bi-amplified active studio monitors, sound-isolated acoustic mount. Fixed Studio Monitors.',
      is_loanable: false,
      status: 'available'
    },
    {
      name: 'HTC Vive Pro 2 Space Tracking Rig (Fixed)',
      category: 'VR / AR',
      serial_number: 'VR-VIVE-FIXED',
      location_id: 2,
      specs: 'Fixed ceiling-mounted SteamVR 2.0 Base Stations, tethered workstation rig.',
      is_loanable: false,
      status: 'available'
    }
  ];

  for (const dev of newDevices) {
    console.log(`Creating device: ${dev.name}...`);
    const res = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/devices',
      method: 'POST',
      headers: authHeaders
    }, dev);
    console.log(`Created ${dev.name}:`, res.status, res.data?.success);
  }

  console.log('Done syncing devices!');
}

run().catch(console.error);
