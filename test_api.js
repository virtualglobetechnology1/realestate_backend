const testApi = async () => {
  try {
    // 1. Register Society
    const regRes = await fetch('http://localhost:5000/api/societies/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        societyName: 'Royal Heights Society',
        registrationNumber: `REG-${Date.now()}`,
        address: 'Sector 15',
        city: 'Mumbai',
        wingNames: ['Wing A', 'Wing B'],
        floorsPerWing: 4,
        flatsPerFloor: 2,
        adminName: 'Admin Sharma',
        adminPhone: '9876543210',
        adminPassword: 'adminpassword123'
      })
    });
    const regData = await regRes.json();
    console.log('✅ Society Registered:', regData.society.name);

    // 2. Fetch Matrix
    const matrixRes = await fetch(`http://localhost:5000/api/admin/society-matrix?societyId=${regData.society.id}`);
    const matrixData = await matrixRes.json();
    const firstFlat = matrixData.wings[0].flats[0];
    console.log('✅ First Flat fetched from database:', firstFlat.flatNumber);

    // 3. Assign Resident to Flat
    const assignRes = await fetch('http://localhost:5000/api/admin/assign-flat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        societyId: regData.society.id,
        flatId: firstFlat.id,
        fullName: 'Vikramaditya Roy',
        phoneNumber: '9123456789',
        password: 'residentpassword123',
        email: 'vikram@gmail.com',
        residentType: 'OWNER'
      })
    });
    const assignData = await assignRes.json();
    console.log('✅ Assigned Resident Response:', assignData);

    // 4. Test Resident Login
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: '9123456789',
        password: 'residentpassword123',
        role: 'RESIDENT'
      })
    });
    const loginData = await loginRes.json();
    console.log('✅ Resident Login Response:', loginData);
  } catch (err) {
    console.error('API Test Error:', err);
  }
};

testApi();
