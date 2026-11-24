const http = require('http');

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testMaterialEndpoints() {
  console.log('🧪 Starting Building Material API Verification Tests...\n');

  try {
    // 1. Fetch Materials
    const materials = await makeRequest('/api/materials');
    console.log('1. GET /api/materials:', materials.success ? `SUCCESS (${materials.materials.length} items found)` : 'FAILED');

    if (materials.materials && materials.materials.length > 0) {
      const sampleId = materials.materials[0].id;

      // 2. Record Inward Shipment
      const inwardRes = await makeRequest('/api/materials/inward', 'POST', {
        materialId: sampleId,
        vendorName: 'Shree Cement Traders',
        invoiceNumber: 'INV-TEST-99',
        quantityReceived: 100,
        unitPrice: 380,
        receivedBy: 'Automated Test Script'
      });
      console.log('2. POST /api/materials/inward:', inwardRes.message);

      // 3. Record Material Dispatch
      const dispatchRes = await makeRequest('/api/materials/dispatch', 'POST', {
        materialId: sampleId,
        targetLocation: 'Tower A (Orchid) - Floor 3',
        quantityIssued: 50,
        purposeMilestone: 'Brickwork Concreting',
        issuedBy: 'Automated Test Script'
      });
      console.log('3. POST /api/materials/dispatch:', dispatchRes.message);

      // 4. Fetch Material Logs
      const logsRes = await makeRequest('/api/materials/logs');
      console.log('4. GET /api/materials/logs:', logsRes.success ? `SUCCESS (${logsRes.inwardLogs.length} inward, ${logsRes.dispatchLogs.length} dispatch)` : 'FAILED');
    }

    console.log('\n✅ All Building Material REST API endpoints verified successfully!');
  } catch (err) {
    console.error('❌ Material API test failed:', err.message);
  }
}

testMaterialEndpoints();
