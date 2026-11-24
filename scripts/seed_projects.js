const mysql = require('mysql2/promise');

async function seed() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'plotsync_db'
  });

  const additionalProjects = [
    {
      id: 'proj-lotus-04',
      name: 'Lotus Lakeview Residences',
      location: 'Lake Promenade, Sarjapur Outer Ring Road, Bangalore',
      total_plots: 60,
      base_rate: 3200,
      category: 'RESIDENTIAL_PLOTTING',
      description: 'Scenic lakeside plotted township with wide avenues and club amenities.',
      blueprint_map_url: '/demo-blueprint-1.png'
    },
    {
      id: 'proj-cyber-05',
      name: 'Cyber City Tech Gateway',
      location: 'IT Expressway Corridor, Phase 2, Hyderabad',
      total_plots: 45,
      base_rate: 4500,
      category: 'COMMERCIAL_PLOTTING',
      description: 'Prime commercial plots suitable for tech offices, banks, and retail hubs.',
      blueprint_map_url: '/demo-blueprint-2.png'
    },
    {
      id: 'proj-elysian-06',
      name: 'Elysian Springs Township',
      location: 'NH-48 Golden Quadrilateral, Sector 28, Gurgaon',
      total_plots: 80,
      base_rate: 3600,
      category: 'RESIDENTIAL_PLOTTING',
      description: 'Integrated gated community with underground cabling and solar lighting.',
      blueprint_map_url: '/demo-blueprint-1.png'
    },
    {
      id: 'proj-silver-07',
      name: 'Silverwood Agro Greens',
      location: 'Kanakapura Countryside Green Belt, Bangalore',
      total_plots: 30,
      base_rate: 2200,
      category: 'FARMHOUSE_COMMUNITY',
      description: 'Organic farmhouse plots with fruit orchards and timber plantations.',
      blueprint_map_url: '/demo-blueprint-2.png'
    },
    {
      id: 'proj-zenith-08',
      name: 'Zenith Boulevard District',
      location: 'Central Avenue, Sector 50, Noida',
      total_plots: 55,
      base_rate: 5100,
      category: 'COMMERCIAL_PLOTTING',
      description: 'High-visibility high-street retail and commercial plots.',
      blueprint_map_url: '/demo-blueprint-1.png'
    },
    {
      id: 'proj-royal-09',
      name: 'Royal Palms Golf County',
      location: 'Yamuna Expressway Link, Sector 19',
      total_plots: 70,
      base_rate: 3900,
      category: 'VILLA_COMMUNITY',
      description: 'Luxury villa development with private access to 9-hole golf course.',
      blueprint_map_url: '/demo-blueprint-2.png'
    },
    {
      id: 'proj-golden-10',
      name: 'Golden Orchard Estates',
      location: 'Airport Bypass Road, Shamshabad, Hyderabad',
      total_plots: 40,
      base_rate: 2800,
      category: 'RESIDENTIAL_PLOTTING',
      description: 'Fast-developing residential layout near international airport.',
      blueprint_map_url: '/demo-blueprint-1.png'
    },
    {
      id: 'proj-grand-11',
      name: 'Grand Boulevard Parklands',
      location: 'East Coast Corridor, OMR, Chennai',
      total_plots: 65,
      base_rate: 3400,
      category: 'RESIDENTIAL_PLOTTING',
      description: 'Serene coastal plotted enclave with 40ft wide tree-lined boulevards.',
      blueprint_map_url: '/demo-blueprint-2.png'
    },
    {
      id: 'proj-crystal-12',
      name: 'Crystal Pinnacle Heights',
      location: 'Hinjewadi Tech Park Phase 3, Pune',
      total_plots: 50,
      base_rate: 4200,
      category: 'COMMERCIAL_PLOTTING',
      description: 'Commercial plotting layout with frontage on main arterial highway.',
      blueprint_map_url: '/demo-blueprint-1.png'
    }
  ];

  for (const p of additionalProjects) {
    await conn.query(`
      INSERT INTO projects (id, name, location, total_plots, base_rate, category, description, blueprint_map_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        name = VALUES(name),
        location = VALUES(location),
        total_plots = VALUES(total_plots),
        base_rate = VALUES(base_rate),
        category = VALUES(category),
        description = VALUES(description),
        blueprint_map_url = VALUES(blueprint_map_url)
    `, [p.id, p.name, p.location, p.total_plots, p.base_rate, p.category, p.description, p.blueprint_map_url]);

    // Insert realistic pins for each project
    await conn.query(`
      INSERT INTO plot_pins (id, project_id, user_id, plot_number, sector_name, pos_x, pos_y, dimensions, sq_ft, base_rate, facing_direction, status, buyer_name, buyer_phone, token_amount, paid_amount)
      VALUES 
        (?, ?, 'default', 'P-01', 'Sector A', 25.5, 30.2, '30x50 ft', 1500, ?, 'NORTH', 'SOLD', 'Naveen Rao', '9845012399', 500000, 2500000),
        (?, ?, 'default', 'P-02', 'Sector A', 42.0, 32.5, '40x60 ft', 2400, ?, 'EAST', 'RESERVED', 'Kavita Sundaram', '9988112233', 300000, 300000),
        (?, ?, 'default', 'P-03', 'Sector A', 60.5, 35.0, '30x50 ft', 1500, ?, 'EAST', 'AVAILABLE', NULL, NULL, 0, 0)
      ON DUPLICATE KEY UPDATE status = VALUES(status)
    `, [
      'pin-' + p.id + '-01', p.id, p.base_rate,
      'pin-' + p.id + '-02', p.id, p.base_rate,
      'pin-' + p.id + '-03', p.id, p.base_rate
    ]);
  }

  const [countRes] = await conn.query('SELECT count(*) as total FROM projects');
  console.log('✅ Total projects in MySQL database now:', countRes[0].total);

  const [allPins] = await conn.query('SELECT count(*) as total FROM plot_pins');
  console.log('✅ Total plot pins in MySQL database now:', allPins[0].total);

  await conn.end();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
