const dbPool = require('./src/db');

// SVG Blueprint Generator for clean architectural layout maps
function generateBlueprintSvg(title, subtitle, numPlots, category) {
  const isCommercial = category === 'COMMERCIAL_PLOTTING';
  const themeColor = isCommercial ? '#0284c7' : '#059669';
  const bgGrid = '#0f172a';
  
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="100%" height="100%">
    <defs>
      <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.75"/>
      </pattern>
      <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
        <rect width="100" height="100" fill="url(#smallGrid)"/>
        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#334155" stroke-width="1.5"/>
      </pattern>
      <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#334155"/>
        <stop offset="50%" stop-color="#475569"/>
        <stop offset="100%" stop-color="#334155"/>
      </linearGradient>
    </defs>

    <!-- Master CAD Canvas Background -->
    <rect width="1200" height="800" fill="${bgGrid}"/>
    <rect width="1200" height="800" fill="url(#grid)"/>

    <!-- Site Boundary Perimeter Line -->
    <rect x="50" y="50" width="1100" height="700" fill="none" stroke="#64748b" stroke-width="3" stroke-dasharray="10,5"/>

    <!-- Central 60-ft Grand Boulevard -->
    <rect x="50" y="360" width="1100" height="80" fill="url(#roadGrad)"/>
    <line x1="50" y1="400" x2="1150" y2="400" stroke="#facc15" stroke-width="2" stroke-dasharray="16,10"/>
    <text x="600" y="405" fill="#f8fafc" font-size="14" font-family="sans-serif" font-weight="bold" letter-spacing="4" text-anchor="middle">60-FT MAIN CENTRAL BOULEVARD</text>

    <!-- North 40-ft Avenue -->
    <rect x="360" y="50" width="60" height="310" fill="url(#roadGrad)"/>
    <line x1="390" y1="50" x2="390" y2="360" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="10,8"/>

    <!-- South 40-ft Avenue -->
    <rect x="780" y="440" width="60" height="310" fill="url(#roadGrad)"/>
    <line x1="810" y1="440" x2="810" y2="750" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="10,8"/>

    <!-- Landscaped Park / Green Belt Zone -->
    <rect x="70" y="70" width="260" height="120" rx="8" fill="#064e3b" stroke="#10b981" stroke-width="2"/>
    <text x="200" y="135" fill="#a7f3d0" font-size="15" font-family="sans-serif" font-weight="bold" text-anchor="middle">🌳 CENTRAL LANDSCAPED PARK</text>
    <text x="200" y="155" fill="#6ee7b7" font-size="11" font-family="sans-serif" text-anchor="middle">Open Green Recreation & Walking Trail</text>

    <!-- Sector Demarcations -->
    <!-- North Sector -->
    <rect x="440" y="70" width="690" height="270" rx="6" fill="#1e293b" fill-opacity="0.6" stroke="${themeColor}" stroke-width="1.5" stroke-dasharray="6,4"/>
    <text x="460" y="100" fill="${themeColor}" font-size="13" font-family="sans-serif" font-weight="bold">SECTOR A (PLOTS 01 TO 25)</text>

    <!-- South Sector -->
    <rect x="70" y="460" width="690" height="270" rx="6" fill="#1e293b" fill-opacity="0.6" stroke="${themeColor}" stroke-width="1.5" stroke-dasharray="6,4"/>
    <text x="90" y="490" fill="${themeColor}" font-size="13" font-family="sans-serif" font-weight="bold">SECTOR B (PLOTS 26 TO 50)</text>

    <!-- Commercial / Amenity Hub -->
    <rect x="860" y="460" width="270" height="270" rx="8" fill="#1e1b4b" stroke="#6366f1" stroke-width="2"/>
    <text x="995" y="580" fill="#c7d2fe" font-size="15" font-family="sans-serif" font-weight="bold" text-anchor="middle">🏢 CLUBHOUSE & UTILITIES</text>
    <text x="995" y="605" fill="#818cf8" font-size="11" font-family="sans-serif" text-anchor="middle">Power Substation & Water Treatment</text>

    <!-- North Compass Indicator -->
    <g transform="translate(1120, 80)">
      <circle cx="0" cy="0" r="28" fill="#0f172a" stroke="#cbd5e1" stroke-width="2"/>
      <polygon points="0,-22 6,-4 -6,-4" fill="#ef4444"/>
      <polygon points="0,22 6,4 -6,4" fill="#94a3b8"/>
      <text x="0" y="-8" fill="#f8fafc" font-size="10" font-family="sans-serif" font-weight="bold" text-anchor="middle">N</text>
    </g>

    <!-- Blueprint Architectural Title Block (Bottom-Right) -->
    <rect x="70" y="705" width="460" height="35" rx="4" fill="#0f172a" stroke="#475569" stroke-width="1"/>
    <text x="85" y="728" fill="#94a3b8" font-size="11" font-family="monospace">PROJECT: <tspan fill="#f8fafc" font-weight="bold">${title.toUpperCase()}</tspan> | APPROVED MASTERPLAN RERA: PRM/KA/RERA/1251/310/PR/260929</text>

    <!-- Top Blueprint Title -->
    <rect x="360" y="15" width="480" height="40" rx="6" fill="#0f172a" stroke="#5b47fb" stroke-width="1.5"/>
    <text x="600" y="40" fill="#f8fafc" font-size="16" font-family="sans-serif" font-weight="900" letter-spacing="2" text-anchor="middle">${title.toUpperCase()} - SITE LAYOUT BLUEPRINT</text>
  </svg>`;
}

async function seedData() {
  console.log('🌱 Starting comprehensive demo data seeding for PlotSync DB...');

  // 1. Projects Table
  console.log('📌 Seeding Projects...');
  
  const projects = [
    {
      id: 'proj-1790598501707',
      name: 'Skyhigh Meadows',
      location: 'Airport Corridor, Devanahalli, Bangalore',
      total_plots: 50,
      base_rate: 2800.00,
      category: 'RESIDENTIAL_PLOTTING',
      description: 'Premium integrated township masterplan featuring 50 residential villa plots, 40-ft wide central boulevards, clubhouse, landscaped green parks, and avenue plantation.',
      blueprint_map_url: generateBlueprintSvg('Skyhigh Meadows', 'Residential Villa Township', 50, 'RESIDENTIAL_PLOTTING')
    },
    {
      id: 'proj-1790598534374',
      name: 'PR Plaza & Commercial Hub',
      location: 'Ring Road, Sector 82 Commercial Zone',
      total_plots: 35,
      base_rate: 4200.00,
      category: 'COMMERCIAL_PLOTTING',
      description: 'High-street SCO retail shop plots, corporate office plots, multi-level visitor parking, and high-footfall corner pavilions.',
      // Keep existing map if present, else fallback to commercial blueprint
      blueprint_map_url: null 
    },
    {
      id: 'proj-greenfield-01',
      name: 'Greenfield Villa Colony',
      location: 'Expressway Green Belt, Sector 104',
      total_plots: 40,
      base_rate: 3500.00,
      category: 'VILLA_COMMUNITY',
      description: 'Eco-luxury gated villa enclave with 100% Vastu-compliant north/east facing plots, private jogging trails, and smart underground utility conduits.',
      blueprint_map_url: generateBlueprintSvg('Greenfield Villa Colony', 'Luxury Gated Villa Enclave', 40, 'VILLA_COMMUNITY')
    }
  ];

  for (const proj of projects) {
    if (proj.blueprint_map_url) {
      await dbPool.query(`
        INSERT INTO projects (id, name, location, total_plots, base_rate, category, description, blueprint_map_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        location = VALUES(location),
        total_plots = VALUES(total_plots),
        base_rate = VALUES(base_rate),
        category = VALUES(category),
        description = VALUES(description),
        blueprint_map_url = IF(projects.blueprint_map_url IS NULL OR projects.blueprint_map_url = '', VALUES(blueprint_map_url), projects.blueprint_map_url)
      `, [proj.id, proj.name, proj.location, proj.total_plots, proj.base_rate, proj.category, proj.description, proj.blueprint_map_url]);
    } else {
      await dbPool.query(`
        INSERT INTO projects (id, name, location, total_plots, base_rate, category, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        location = VALUES(location),
        total_plots = VALUES(total_plots),
        base_rate = VALUES(base_rate),
        category = VALUES(category),
        description = VALUES(description)
      `, [proj.id, proj.name, proj.location, proj.total_plots, proj.base_rate, proj.category, proj.description]);
    }
    console.log(`  ✓ Project synced: ${proj.name} (${proj.id})`);
  }

  // 2. Clear out old mismatched pins or re-align
  console.log('📌 Seeding Plot Pins with authentic customer purchase & allotment entries...');

  const plotPins = [
    // --- PROJECT 1: SKYHIGH MEADOWS (proj-1790598501707) ---
    {
      id: 'pin-sh-01',
      project_id: 'proj-1790598501707',
      plot_number: 'P-01',
      sector_name: 'Sector A',
      pos_x: 48.50,
      pos_y: 22.00,
      dimensions: '40x60 ft',
      sq_ft: 2400.00,
      base_rate: 2800.00,
      facing_direction: 'EAST',
      status: 'SOLD',
      buyer_name: 'Rajesh Kumar Verma',
      buyer_phone: '+91 98201 54321',
      buyer_email: 'rajesh.verma@tcs.com',
      payment_plan: 'DOWN_PAYMENT (80:20)',
      allotted_date: '2026-09-18',
      token_amount: 650000.00,
      paid_amount: 5800000.00,
      is_corner: 1
    },
    {
      id: 'pin-sh-02',
      project_id: 'proj-1790598501707',
      plot_number: 'P-02',
      sector_name: 'Sector A',
      pos_x: 56.20,
      pos_y: 22.00,
      dimensions: '30x50 ft',
      sq_ft: 1500.00,
      base_rate: 2800.00,
      facing_direction: 'EAST',
      status: 'SOLD',
      buyer_name: 'Dr. Priya Deshmukh',
      buyer_phone: '+91 98450 12890',
      buyer_email: 'dr.priya.deshmukh@apollo.org',
      payment_plan: 'MILESTONE_10_20_70',
      allotted_date: '2026-09-21',
      token_amount: 420000.00,
      paid_amount: 1680000.00,
      is_corner: 0
    },
    {
      id: 'pin-sh-03',
      project_id: 'proj-1790598501707',
      plot_number: 'P-03',
      sector_name: 'Sector A',
      pos_x: 64.00,
      pos_y: 22.00,
      dimensions: '30x50 ft',
      sq_ft: 1500.00,
      base_rate: 2800.00,
      facing_direction: 'NORTH',
      status: 'RESERVED',
      buyer_name: 'Vikram & Sunita Malhotra',
      buyer_phone: '+91 98111 23456',
      buyer_email: 'vikram.malhotra@gmail.com',
      payment_plan: '24-HR TOKEN HOLD',
      allotted_date: '2026-09-28',
      token_amount: 210000.00,
      paid_amount: 210000.00,
      is_corner: 0
    },
    {
      id: 'pin-sh-04',
      project_id: 'proj-1790598501707',
      plot_number: 'P-04',
      sector_name: 'Sector A',
      pos_x: 72.00,
      pos_y: 22.00,
      dimensions: '30x50 ft',
      sq_ft: 1500.00,
      base_rate: 2800.00,
      facing_direction: 'NORTH',
      status: 'AVAILABLE',
      buyer_name: null,
      buyer_phone: null,
      buyer_email: null,
      payment_plan: 'MILESTONE',
      allotted_date: null,
      token_amount: 0,
      paid_amount: 0,
      is_corner: 0
    },
    {
      id: 'pin-sh-05',
      project_id: 'proj-1790598501707',
      plot_number: 'P-05',
      sector_name: 'Sector A',
      pos_x: 80.00,
      pos_y: 22.00,
      dimensions: '30x40 ft',
      sq_ft: 1200.00,
      base_rate: 2800.00,
      facing_direction: 'EAST',
      status: 'AVAILABLE',
      buyer_name: null,
      buyer_phone: null,
      buyer_email: null,
      payment_plan: 'MILESTONE',
      allotted_date: null,
      token_amount: 0,
      paid_amount: 0,
      is_corner: 0
    },
    {
      id: 'pin-sh-06',
      project_id: 'proj-1790598501707',
      plot_number: 'P-06',
      sector_name: 'Sector B',
      pos_x: 18.00,
      pos_y: 65.00,
      dimensions: '35x50 ft',
      sq_ft: 1750.00,
      base_rate: 2800.00,
      facing_direction: 'WEST',
      status: 'SOLD',
      buyer_name: 'Amitabh Singhania',
      buyer_phone: '+91 98333 45678',
      buyer_email: 'amitabh.singhania@yahoo.com',
      payment_plan: 'CONSTRUCTION_LINKED',
      allotted_date: '2026-09-14',
      token_amount: 500000.00,
      paid_amount: 2520000.00,
      is_corner: 0
    },
    {
      id: 'pin-sh-07',
      project_id: 'proj-1790598501707',
      plot_number: 'P-07',
      sector_name: 'Sector B',
      pos_x: 28.00,
      pos_y: 65.00,
      dimensions: '30x50 ft',
      sq_ft: 1500.00,
      base_rate: 2800.00,
      facing_direction: 'EAST',
      status: 'AVAILABLE',
      buyer_name: null,
      buyer_phone: null,
      buyer_email: null,
      payment_plan: 'MILESTONE',
      allotted_date: null,
      token_amount: 0,
      paid_amount: 0,
      is_corner: 0
    },
    {
      id: 'pin-sh-08',
      project_id: 'proj-1790598501707',
      plot_number: 'P-08',
      sector_name: 'Sector B',
      pos_x: 38.00,
      pos_y: 65.00,
      dimensions: '40x60 ft',
      sq_ft: 2400.00,
      base_rate: 2800.00,
      facing_direction: 'NORTH-EAST',
      status: 'RESERVED',
      buyer_name: 'Neha Kapoor',
      buyer_phone: '+91 98765 89012',
      buyer_email: 'neha.kapoor@infy.com',
      payment_plan: '24-HR TOKEN HOLD',
      allotted_date: '2026-09-29',
      token_amount: 350000.00,
      paid_amount: 350000.00,
      is_corner: 1
    },
    {
      id: 'pin-sh-09',
      project_id: 'proj-1790598501707',
      plot_number: 'P-09',
      sector_name: 'Sector B',
      pos_x: 48.00,
      pos_y: 65.00,
      dimensions: '25x40 ft',
      sq_ft: 1000.00,
      base_rate: 2800.00,
      facing_direction: 'NORTH',
      status: 'AVAILABLE',
      buyer_name: null,
      buyer_phone: null,
      buyer_email: null,
      payment_plan: 'MILESTONE',
      allotted_date: null,
      token_amount: 0,
      paid_amount: 0,
      is_corner: 0
    },
    {
      id: 'pin-sh-10',
      project_id: 'proj-1790598501707',
      plot_number: 'P-10',
      sector_name: 'Sector B',
      pos_x: 58.00,
      pos_y: 65.00,
      dimensions: '30x50 ft',
      sq_ft: 1500.00,
      base_rate: 2800.00,
      facing_direction: 'EAST',
      status: 'AVAILABLE',
      buyer_name: null,
      buyer_phone: null,
      buyer_email: null,
      payment_plan: 'MILESTONE',
      allotted_date: null,
      token_amount: 0,
      paid_amount: 0,
      is_corner: 0
    },

    // --- PROJECT 2: PR PLAZA & COMMERCIAL HUB (proj-1790598534374) ---
    {
      id: 'pin-pr-52',
      project_id: 'proj-1790598534374',
      plot_number: 'SCO-52',
      sector_name: 'Sector aA',
      pos_x: 42.50,
      pos_y: 44.50,
      dimensions: '50x80 ft',
      sq_ft: 4000.00,
      base_rate: 4200.00,
      facing_direction: 'EAST',
      status: 'SOLD',
      buyer_name: 'Kavita Reddy (Reddy Healthcare & Pharma)',
      buyer_phone: '+91 98800 11223',
      buyer_email: 'kavita.reddy@reddypharma.in',
      payment_plan: 'COMMERCIAL_MILESTONE',
      allotted_date: '2026-09-10',
      token_amount: 1500000.00,
      paid_amount: 8400000.00,
      is_corner: 1
    },
    {
      id: 'pin-pr-60',
      project_id: 'proj-1790598534374',
      plot_number: 'SCO-60',
      sector_name: 'Sector aA',
      pos_x: 48.00,
      pos_y: 53.50,
      dimensions: '30x50 ft',
      sq_ft: 1500.00,
      base_rate: 4200.00,
      facing_direction: 'NORTH',
      status: 'SOLD',
      buyer_name: 'Deepak Saxena (Saxena Jewelers)',
      buyer_phone: '+91 98290 77889',
      buyer_email: 'deepak.saxena@saxenajewels.com',
      payment_plan: 'FLEXI_PAYMENT',
      allotted_date: '2026-09-22',
      token_amount: 630000.00,
      paid_amount: 3150000.00,
      is_corner: 0
    },
    {
      id: 'pin-pr-83',
      project_id: 'proj-1790598534374',
      plot_number: 'SCO-83',
      sector_name: 'Sector aA',
      pos_x: 54.00,
      pos_y: 53.50,
      dimensions: '30x50 ft',
      sq_ft: 1500.00,
      base_rate: 4200.00,
      facing_direction: 'EAST',
      status: 'RESERVED',
      buyer_name: 'Rahul & Pooja Chawla',
      buyer_phone: '+91 99100 88990',
      buyer_email: 'rahul.chawla@gmail.com',
      payment_plan: '24-HR TOKEN HOLD',
      allotted_date: '2026-09-28',
      token_amount: 315000.00,
      paid_amount: 315000.00,
      is_corner: 0
    },
    {
      id: 'pin-pr-69',
      project_id: 'proj-1790598534374',
      plot_number: 'SCO-69',
      sector_name: 'Sector aA',
      pos_x: 47.12,
      pos_y: 52.83,
      dimensions: '30x50 ft',
      sq_ft: 1500.00,
      base_rate: 4200.00,
      facing_direction: 'EAST',
      status: 'AVAILABLE',
      buyer_name: null,
      buyer_phone: null,
      buyer_email: null,
      payment_plan: 'MILESTONE',
      allotted_date: null,
      token_amount: 0,
      paid_amount: 0,
      is_corner: 0
    },
    {
      id: 'pin-pr-71',
      project_id: 'proj-1790598534374',
      plot_number: 'SCO-71',
      sector_name: 'Sector aA',
      pos_x: 60.50,
      pos_y: 53.50,
      dimensions: '30x50 ft',
      sq_ft: 1500.00,
      base_rate: 4200.00,
      facing_direction: 'NORTH',
      status: 'AVAILABLE',
      buyer_name: null,
      buyer_phone: null,
      buyer_email: null,
      payment_plan: 'MILESTONE',
      allotted_date: null,
      token_amount: 0,
      paid_amount: 0,
      is_corner: 0
    },
    {
      id: 'pin-pr-72',
      project_id: 'proj-1790598534374',
      plot_number: 'SCO-72',
      sector_name: 'Sector aA',
      pos_x: 66.80,
      pos_y: 53.50,
      dimensions: '40x50 ft',
      sq_ft: 2000.00,
      base_rate: 4500.00,
      facing_direction: 'EAST',
      status: 'AVAILABLE',
      buyer_name: null,
      buyer_phone: null,
      buyer_email: null,
      payment_plan: 'MILESTONE',
      allotted_date: null,
      token_amount: 0,
      paid_amount: 0,
      is_corner: 1
    },

    // --- PROJECT 3: GREENFIELD VILLA COLONY (proj-greenfield-01) ---
    {
      id: 'pin-gf-01',
      project_id: 'proj-greenfield-01',
      plot_number: 'Villa-01',
      sector_name: 'Sector A',
      pos_x: 50.00,
      pos_y: 20.00,
      dimensions: '50x60 ft',
      sq_ft: 3000.00,
      base_rate: 3500.00,
      facing_direction: 'NORTH-EAST',
      status: 'SOLD',
      buyer_name: 'Col. Devendra Singh Rathore',
      buyer_phone: '+91 98210 99887',
      buyer_email: 'col.rathore@defence.gov.in',
      payment_plan: 'SPECIAL_DEFENCE_PLAN',
      allotted_date: '2026-09-12',
      token_amount: 1000000.00,
      paid_amount: 6000000.00,
      is_corner: 1
    },
    {
      id: 'pin-gf-02',
      project_id: 'proj-greenfield-01',
      plot_number: 'Villa-02',
      sector_name: 'Sector A',
      pos_x: 60.00,
      pos_y: 20.00,
      dimensions: '40x60 ft',
      sq_ft: 2400.00,
      base_rate: 3500.00,
      facing_direction: 'EAST',
      status: 'SOLD',
      buyer_name: 'Ananya & Rohan Sengupta',
      buyer_phone: '+91 98300 44556',
      buyer_email: 'rohan.sengupta@google.com',
      payment_plan: 'MILESTONE_30_70',
      allotted_date: '2026-09-24',
      token_amount: 840000.00,
      paid_amount: 3360000.00,
      is_corner: 0
    },
    {
      id: 'pin-gf-03',
      project_id: 'proj-greenfield-01',
      plot_number: 'Villa-03',
      sector_name: 'Sector A',
      pos_x: 70.00,
      pos_y: 20.00,
      dimensions: '40x60 ft',
      sq_ft: 2400.00,
      base_rate: 3500.00,
      facing_direction: 'NORTH',
      status: 'RESERVED',
      buyer_name: 'Sanjay Nair',
      buyer_phone: '+91 98470 66778',
      buyer_email: 'sanjay.nair@wipro.com',
      payment_plan: '24-HR TOKEN HOLD',
      allotted_date: '2026-09-29',
      token_amount: 420000.00,
      paid_amount: 420000.00,
      is_corner: 0
    },
    {
      id: 'pin-gf-04',
      project_id: 'proj-greenfield-01',
      plot_number: 'Villa-04',
      sector_name: 'Sector A',
      pos_x: 80.00,
      pos_y: 20.00,
      dimensions: '40x60 ft',
      sq_ft: 2400.00,
      base_rate: 3500.00,
      facing_direction: 'NORTH',
      status: 'AVAILABLE',
      buyer_name: null,
      buyer_phone: null,
      buyer_email: null,
      payment_plan: 'MILESTONE',
      allotted_date: null,
      token_amount: 0,
      paid_amount: 0,
      is_corner: 0
    },
    {
      id: 'pin-gf-05',
      project_id: 'proj-greenfield-01',
      plot_number: 'Villa-05',
      sector_name: 'Sector B',
      pos_x: 25.00,
      pos_y: 65.00,
      dimensions: '30x60 ft',
      sq_ft: 1800.00,
      base_rate: 3500.00,
      facing_direction: 'EAST',
      status: 'AVAILABLE',
      buyer_name: null,
      buyer_phone: null,
      buyer_email: null,
      payment_plan: 'MILESTONE',
      allotted_date: null,
      token_amount: 0,
      paid_amount: 0,
      is_corner: 0
    },
    {
      id: 'pin-gf-06',
      project_id: 'proj-greenfield-01',
      plot_number: 'Villa-06',
      sector_name: 'Sector B',
      pos_x: 40.00,
      pos_y: 65.00,
      dimensions: '50x64 ft',
      sq_ft: 3200.00,
      base_rate: 3500.00,
      facing_direction: 'NORTH-EAST',
      status: 'AVAILABLE',
      buyer_name: null,
      buyer_phone: null,
      buyer_email: null,
      payment_plan: 'MILESTONE',
      allotted_date: null,
      token_amount: 0,
      paid_amount: 0,
      is_corner: 1
    }
  ];

  // Insert or update each pin in plot_pins
  for (const pin of plotPins) {
    await dbPool.query(`
      INSERT INTO plot_pins (
        id, project_id, user_id, plot_number, sector_name, pos_x, pos_y,
        dimensions, sq_ft, base_rate, facing_direction, status,
        buyer_name, buyer_phone, buyer_email, payment_plan, allotted_date,
        token_amount, paid_amount, is_corner
      )
      VALUES (?, ?, 'default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      project_id = VALUES(project_id),
      plot_number = VALUES(plot_number),
      sector_name = VALUES(sector_name),
      pos_x = VALUES(pos_x),
      pos_y = VALUES(pos_y),
      dimensions = VALUES(dimensions),
      sq_ft = VALUES(sq_ft),
      base_rate = VALUES(base_rate),
      facing_direction = VALUES(facing_direction),
      status = VALUES(status),
      buyer_name = VALUES(buyer_name),
      buyer_phone = VALUES(buyer_phone),
      buyer_email = VALUES(buyer_email),
      payment_plan = VALUES(payment_plan),
      allotted_date = VALUES(allotted_date),
      token_amount = VALUES(token_amount),
      paid_amount = VALUES(paid_amount),
      is_corner = VALUES(is_corner)
    `, [
      pin.id, pin.project_id, pin.plot_number, pin.sector_name, pin.pos_x, pin.pos_y,
      pin.dimensions, pin.sq_ft, pin.base_rate, pin.facing_direction, pin.status,
      pin.buyer_name, pin.buyer_phone, pin.buyer_email, pin.payment_plan, pin.allotted_date,
      pin.token_amount, pin.paid_amount, pin.is_corner
    ]);
  }

  // Clean up any old orphaned pins from obsolete project ids
  await dbPool.query(`
    DELETE FROM plot_pins 
    WHERE project_id NOT IN ('proj-1790598501707', 'proj-1790598534374', 'proj-greenfield-01')
  `);

  console.log(`✅ Successfully seeded ${plotPins.length} plots with customer records across 3 projects into MySQL!`);
  process.exit(0);
}

seedData().catch(err => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
