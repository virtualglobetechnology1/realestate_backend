const dbPool = require('./db');

async function seedSkyhighMeadowsData() {
  console.log('🚀 Starting demo data insertion for project: Skyhigh Meadows...');

  try {
    // 1. Check or Create Project 'Skyhigh Meadows'
    const [projRows] = await dbPool.query(
      "SELECT id, project_code, name FROM plot_manage_projects WHERE name LIKE '%Skyhigh Meadows%'"
    );

    let projectCode = 'proj-skyhigh-01';
    let projectId = 'proj-skyhigh-01';

    if (projRows.length > 0) {
      projectCode = projRows[0].project_code || projRows[0].id.toString();
      projectId = projectCode;
      console.log(`📌 Found existing Skyhigh Meadows project (Code/ID: ${projectCode})`);
    } else {
      const [insertProj] = await dbPool.query(
        `INSERT INTO plot_manage_projects (project_code, user_id, name, location, total_plots, base_rate, category, description)
         VALUES (?, 'usr-admin-01', 'Skyhigh Meadows', 'Sector 42, Express Highway Boulevard', 60, 3200.00, 'RESIDENTIAL_PLOTTING', 'Luxury plotted township & high-rise tower development with modern masterplan layouts and green amenities.')`,
        [projectCode]
      );
      console.log(`✅ Created project 'Skyhigh Meadows' in plot_manage_projects (Auto ID: ${insertProj.insertId}, Code: ${projectCode})`);
    }

    // Also get or insert for user 'usr-admin-01' or all matching
    const [userProjects] = await dbPool.query(
      "SELECT project_code FROM plot_manage_projects WHERE name LIKE '%Skyhigh Meadows%'"
    );
    const targetProjectCodes = Array.from(new Set([projectCode, ...userProjects.map(p => p.project_code)]));

    // 2. Insert/Upsert Plot Pins for Skyhigh Meadows in plot_manage_pins
    const demoPins = [
      {
        pin_code: `pin-sky-101`,
        project_id: projectCode,
        user_id: 'usr-admin-01',
        plot_number: 'P-101',
        sector_name: 'Sector A (Emerald)',
        pos_x: 18.5,
        pos_y: 25.0,
        dimensions: '30x50 ft',
        sq_ft: 1500,
        base_rate: 3200,
        facing_direction: 'EAST',
        status: 'SOLD',
        buyer_name: 'Rajesh & Sunita Verma',
        buyer_phone: '9820123456',
        buyer_email: 'rajesh.verma@gmail.com',
        buyer_id_proof: 'AADHAR-8899-2341',
        is_corner: 1,
        payment_plan: 'MILESTONE',
        allotted_date: '2026-08-15',
        token_amount: 100000.00,
        paid_amount: 2500000.00,
        sourcing_type: 'AGENT',
        agent_id: 'agt-101',
        agent_name: 'Ramesh Sharma',
        agent_phone: '9876599001',
        agent_commission_pct: 2.50,
        agent_commission_amount: 132000.00
      },
      {
        pin_code: `pin-sky-102`,
        project_id: projectCode,
        user_id: 'usr-admin-01',
        plot_number: 'P-102',
        sector_name: 'Sector A (Emerald)',
        pos_x: 28.0,
        pos_y: 25.0,
        dimensions: '30x50 ft',
        sq_ft: 1500,
        base_rate: 3200,
        facing_direction: 'NORTH',
        status: 'HOLD',
        buyer_name: 'Karan Malhotra',
        buyer_phone: '9811223344',
        buyer_email: 'karan.m@outlook.com',
        buyer_id_proof: 'PAN-BCKPM9901K',
        is_corner: 0,
        payment_plan: 'TOKEN_24HR',
        allotted_date: '2026-10-05',
        token_amount: 50000.00,
        paid_amount: 50000.00,
        sourcing_type: 'DIRECT',
        agent_id: null,
        agent_name: null,
        agent_phone: null,
        agent_commission_pct: 0,
        agent_commission_amount: 0
      },
      {
        pin_code: `pin-sky-103`,
        project_id: projectCode,
        user_id: 'usr-admin-01',
        plot_number: 'P-103',
        sector_name: 'Sector A (Emerald)',
        pos_x: 37.5,
        pos_y: 25.0,
        dimensions: '40x60 ft',
        sq_ft: 2400,
 base_rate: 3400,
        facing_direction: 'EAST',
        status: 'SOLD',
        buyer_name: 'Dr. Meenakshi Sundaram',
        buyer_phone: '9940332211',
        buyer_email: 'dr.meenakshi@apollohospital.org',
        buyer_id_proof: 'PASSPORT-Z9012384',
        is_corner: 1,
        payment_plan: 'FULL_PAYMENT',
        allotted_date: '2026-07-20',
        token_amount: 200000.00,
        paid_amount: 8160000.00,
        sourcing_type: 'AGENT',
        agent_id: 'agt-102',
        agent_name: 'Priya Sundaram',
        agent_phone: '9876599002',
        agent_commission_pct: 3.00,
        agent_commission_amount: 244800.00
      },
      {
        pin_code: `pin-sky-104`,
        project_id: projectCode,
        user_id: 'usr-admin-01',
        plot_number: 'P-104',
        sector_name: 'Sector A (Emerald)',
        pos_x: 47.0,
        pos_y: 25.0,
        dimensions: '30x50 ft',
        sq_ft: 1500,
        base_rate: 3200,
        facing_direction: 'WEST',
        status: 'AVAILABLE',
        buyer_name: null,
        buyer_phone: null,
        buyer_email: null,
        buyer_id_proof: null,
        is_corner: 0,
        payment_plan: 'MILESTONE',
        allotted_date: null,
        token_amount: 0,
        paid_amount: 0,
        sourcing_type: 'DIRECT',
        agent_id: null,
        agent_name: null,
        agent_phone: null,
        agent_commission_pct: 0,
        agent_commission_amount: 0
      },
      {
        pin_code: `pin-sky-105`,
        project_id: projectCode,
        user_id: 'usr-admin-01',
        plot_number: 'P-105',
        sector_name: 'Sector B (Sapphire)',
        pos_x: 18.5,
        pos_y: 55.0,
        dimensions: '35x55 ft',
        sq_ft: 1925,
        base_rate: 3300,
        facing_direction: 'NORTH_EAST',
        status: 'SOLD',
        buyer_name: 'Vikramjit & Simran Kaur',
        buyer_phone: '9872110099',
        buyer_email: 'vikram.kaur@yahoo.co.in',
        buyer_id_proof: 'AADHAR-1122-3344',
        is_corner: 1,
        payment_plan: 'MILESTONE',
        allotted_date: '2026-09-01',
        token_amount: 150000.00,
        paid_amount: 3500000.00,
        sourcing_type: 'AGENT',
        agent_id: 'agt-103',
        agent_name: 'Vikramaditya Solanki',
        agent_phone: '9876599003',
        agent_commission_pct: 2.00,
        agent_commission_amount: 127050.00
      },
      {
        pin_code: `pin-sky-106`,
        project_id: projectCode,
        user_id: 'usr-admin-01',
        plot_number: 'P-106',
        sector_name: 'Sector B (Sapphire)',
        pos_x: 28.0,
        pos_y: 55.0,
        dimensions: '30x50 ft',
        sq_ft: 1500,
        base_rate: 3200,
        facing_direction: 'SOUTH',
        status: 'AVAILABLE',
        buyer_name: null,
        buyer_phone: null,
        buyer_email: null,
        buyer_id_proof: null,
        is_corner: 0,
        payment_plan: 'MILESTONE',
        allotted_date: null,
        token_amount: 0,
        paid_amount: 0,
        sourcing_type: 'DIRECT',
        agent_id: null,
        agent_name: null,
        agent_phone: null,
        agent_commission_pct: 0,
        agent_commission_amount: 0
      },
      {
        pin_code: `pin-sky-107`,
        project_id: projectCode,
        user_id: 'usr-admin-01',
        plot_number: 'P-107',
        sector_name: 'Sector B (Sapphire)',
        pos_x: 37.5,
        pos_y: 55.0,
        dimensions: '50x80 ft',
        sq_ft: 4000,
        base_rate: 3600,
        facing_direction: 'EAST',
        status: 'HOLD',
        buyer_name: 'Suresh Kumar Aggarwal',
        buyer_phone: '9810055443',
        buyer_email: 'sk.aggarwal@aggarwalgroup.com',
        buyer_id_proof: 'PAN-AAAC1234F',
        is_corner: 1,
        payment_plan: 'TOKEN_24HR',
        allotted_date: '2026-10-06',
        token_amount: 250000.00,
        paid_amount: 250000.00,
        sourcing_type: 'DIRECT',
        agent_id: null,
        agent_name: null,
        agent_phone: null,
        agent_commission_pct: 0,
        agent_commission_amount: 0
      },
      {
        pin_code: `pin-sky-108`,
        project_id: projectCode,
        user_id: 'usr-admin-01',
        plot_number: 'P-108',
        sector_name: 'Sector C (Grand Villa)',
        pos_x: 65.0,
        pos_y: 40.0,
        dimensions: '50x100 ft',
        sq_ft: 5000,
        base_rate: 3800,
        facing_direction: 'NORTH',
        status: 'SOLD',
        buyer_name: 'Tariq Hussain & Family',
        buyer_phone: '9899887766',
        buyer_email: 'tariq.hussain@techcorp.io',
        buyer_id_proof: 'PASSPORT-K4499100',
        is_corner: 1,
        payment_plan: 'FULL_PAYMENT',
        allotted_date: '2026-06-10',
        token_amount: 500000.00,
        paid_amount: 19000000.00,
        sourcing_type: 'AGENT',
        agent_id: 'agt-101',
        agent_name: 'Ramesh Sharma',
        agent_phone: '9876599001',
        agent_commission_pct: 2.50,
        agent_commission_amount: 475000.00
      }
    ];

    for (const pin of demoPins) {
      await dbPool.query(
        `INSERT INTO plot_manage_pins (
          pin_code, project_id, user_id, plot_number, sector_name, pos_x, pos_y, dimensions, sq_ft, base_rate, facing_direction, status, buyer_name, buyer_phone, buyer_email, buyer_id_proof, is_corner, payment_plan, allotted_date, token_amount, paid_amount, sourcing_type, agent_id, agent_name, agent_phone, agent_commission_pct, agent_commission_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          project_id=VALUES(project_id),
          user_id=VALUES(user_id),
          plot_number=VALUES(plot_number),
          sector_name=VALUES(sector_name),
          pos_x=VALUES(pos_x),
          pos_y=VALUES(pos_y),
          dimensions=VALUES(dimensions),
          sq_ft=VALUES(sq_ft),
          base_rate=VALUES(base_rate),
          facing_direction=VALUES(facing_direction),
          status=VALUES(status),
          buyer_name=VALUES(buyer_name),
          buyer_phone=VALUES(buyer_phone),
          buyer_email=VALUES(buyer_email),
          buyer_id_proof=VALUES(buyer_id_proof),
          is_corner=VALUES(is_corner),
          payment_plan=VALUES(payment_plan),
          allotted_date=VALUES(allotted_date),
          token_amount=VALUES(token_amount),
          paid_amount=VALUES(paid_amount),
          sourcing_type=VALUES(sourcing_type),
          agent_id=VALUES(agent_id),
          agent_name=VALUES(agent_name),
          agent_phone=VALUES(agent_phone),
          agent_commission_pct=VALUES(agent_commission_pct),
          agent_commission_amount=VALUES(agent_commission_amount)`,
        [
          pin.pin_code, pin.project_id, pin.user_id, pin.plot_number, pin.sector_name, pin.pos_x, pin.pos_y, pin.dimensions, pin.sq_ft, pin.base_rate, pin.facing_direction, pin.status, pin.buyer_name, pin.buyer_phone, pin.buyer_email, pin.buyer_id_proof, pin.is_corner, pin.payment_plan, pin.allotted_date, pin.token_amount, pin.paid_amount, pin.sourcing_type, pin.agent_id, pin.agent_name, pin.agent_phone, pin.agent_commission_pct, pin.agent_commission_amount
        ]
      );
    }
    console.log(`✅ Seeded ${demoPins.length} plot layout pins for Skyhigh Meadows!`);

    // 3. Insert Materials for Skyhigh Meadows in plot_manage_materials
    const demoMaterials = [
      {
        material_code: 'mat-sky-101',
        project_id: projectCode,
        material_name: 'UltraTech Weather Plus Cement',
        category: 'STRUCTURAL',
        unit_of_measure: 'Bags',
        current_stock: 450.00,
        reorder_threshold: 100.00,
        avg_unit_cost: 350.00,
        supplier_contact: 'Ambuja Cement Corp / UltraTech Direct'
      },
      {
        material_code: 'mat-sky-102',
        project_id: projectCode,
        material_name: 'JSW Neosteel TMT Steel Rebars 16mm',
        category: 'STRUCTURAL',
        unit_of_measure: 'Tons',
        current_stock: 28.50,
        reorder_threshold: 15.00,
        avg_unit_cost: 64000.00,
        supplier_contact: 'JSW Steel Distributors'
      },
      {
        material_code: 'mat-sky-103',
        project_id: projectCode,
        material_name: 'Fly Ash High-Density Concrete Blocks',
        category: 'MASONRY',
        unit_of_measure: 'Pieces',
        current_stock: 18500.00,
        reorder_threshold: 4000.00,
        avg_unit_cost: 38.00,
        supplier_contact: 'Skyline Brick Kilns & Blocks'
      },
      {
        material_code: 'mat-sky-104',
        project_id: projectCode,
        material_name: 'Kajaria Glazed Vitrified Tiles 4x2 ft',
        category: 'FINISHING',
        unit_of_measure: 'Boxes',
        current_stock: 160.00,
        reorder_threshold: 50.00,
        avg_unit_cost: 850.00,
        supplier_contact: 'Kajaria World Showroom'
      },
      {
        material_code: 'mat-sky-105',
        project_id: projectCode,
        material_name: 'Finolex Underground Drainage Pipes 110mm',
        category: 'PLUMBING',
        unit_of_measure: 'Meters',
        current_stock: 320.00,
        reorder_threshold: 60.00,
        avg_unit_cost: 520.00,
        supplier_contact: 'Finolex Pipes & Fittings'
      },
      {
        material_code: 'mat-sky-106',
        project_id: projectCode,
        material_name: 'Asian Paints Apex Ultima Exterior Emulsion',
        category: 'FINISHING',
        unit_of_measure: 'Liters',
        current_stock: 120.00,
        reorder_threshold: 25.00,
        avg_unit_cost: 3200.00,
        supplier_contact: 'Asian Paints Depot'
      },
      {
        material_code: 'mat-sky-107',
        project_id: projectCode,
        material_name: 'River Sand (Coarse Grade for Concrete)',
        category: 'STRUCTURAL',
        unit_of_measure: 'Tons',
        current_stock: 85.00,
        reorder_threshold: 20.00,
        avg_unit_cost: 1400.00,
        supplier_contact: 'City Mining & Aggregates'
      }
    ];

    for (const mat of demoMaterials) {
      await dbPool.query(
        `INSERT INTO plot_manage_materials (
          material_code, project_id, material_name, category, unit_of_measure, current_stock, reorder_threshold, avg_unit_cost, supplier_contact
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          project_id=VALUES(project_id),
          material_name=VALUES(material_name),
          category=VALUES(category),
          unit_of_measure=VALUES(unit_of_measure),
          current_stock=VALUES(current_stock),
          reorder_threshold=VALUES(reorder_threshold),
          avg_unit_cost=VALUES(avg_unit_cost),
          supplier_contact=VALUES(supplier_contact)`,
        [
          mat.material_code, mat.project_id, mat.material_name, mat.category, mat.unit_of_measure, mat.current_stock, mat.reorder_threshold, mat.avg_unit_cost, mat.supplier_contact
        ]
      );
    }
    console.log(`✅ Seeded ${demoMaterials.length} materials for Skyhigh Meadows!`);

    // 4. Insert Inward Material Logs in plot_manage_material_inward_logs
    const demoInwards = [
      {
        log_code: 'inw-sky-001',
        material_id: 'mat-sky-101',
        project_id: projectCode,
        vendor_name: 'Ambuja Cement Corp',
        invoice_number: 'INV-2026-8801',
        quantity_received: 500,
        unit_price: 350,
        total_cost: 175000,
        received_by: 'Er. Rajesh Patil (Site Supervisor)'
      },
      {
        log_code: 'inw-sky-002',
        material_id: 'mat-sky-102',
        project_id: projectCode,
        vendor_name: 'JSW Steel Distributors',
        invoice_number: 'INV-2026-8802',
        quantity_received: 30,
        unit_price: 64000,
        total_cost: 1920000,
        received_by: 'Er. Rajesh Patil (Site Supervisor)'
      },
      {
        log_code: 'inw-sky-003',
        material_id: 'mat-sky-103',
        project_id: projectCode,
        vendor_name: 'Skyline Brick Kilns & Blocks',
        invoice_number: 'INV-2026-8803',
        quantity_received: 20000,
        unit_price: 38,
        total_cost: 760000,
        received_by: 'Sunil Store Keeper'
      }
    ];

    for (const inw of demoInwards) {
      await dbPool.query(
        `INSERT INTO plot_manage_material_inward_logs (
          log_code, material_id, project_id, vendor_name, invoice_number, quantity_received, unit_price, total_cost, received_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          project_id=VALUES(project_id),
          vendor_name=VALUES(vendor_name),
          invoice_number=VALUES(invoice_number),
          quantity_received=VALUES(quantity_received),
          unit_price=VALUES(unit_price),
          total_cost=VALUES(total_cost),
          received_by=VALUES(received_by)`,
        [
          inw.log_code, inw.material_id, inw.project_id, inw.vendor_name, inw.invoice_number, inw.quantity_received, inw.unit_price, inw.total_cost, inw.received_by
        ]
      );
    }
    console.log(`✅ Seeded ${demoInwards.length} inward logs for Skyhigh Meadows!`);

    // 5. Insert Dispatch Material Logs in plot_manage_material_dispatch_logs
    const demoDispatches = [
      {
        log_code: 'dsp-sky-001',
        material_id: 'mat-sky-101',
        project_id: projectCode,
        target_location: 'Skyhigh Tower A - Foundation Slab',
        quantity_issued: 50,
        purpose_milestone: 'Plinth Concrete Casting',
        issued_by: 'Sunil Store Keeper'
      },
      {
        log_code: 'dsp-sky-002',
        material_id: 'mat-sky-102',
        project_id: projectCode,
        target_location: 'Sector B - Main Gate Pillar Reinforcement',
        quantity_issued: 1.5,
        purpose_milestone: 'Gate Arch Structure',
        issued_by: 'Sunil Store Keeper'
      },
      {
        log_code: 'dsp-sky-003',
        material_id: 'mat-sky-103',
        project_id: projectCode,
        target_location: 'Sector A - Boundary Wall Construction',
        quantity_issued: 1500,
        purpose_milestone: 'Perimeter Wall Masonry',
        issued_by: 'Sunil Store Keeper'
      }
    ];

    for (const dsp of demoDispatches) {
      await dbPool.query(
        `INSERT INTO plot_manage_material_dispatch_logs (
          log_code, material_id, project_id, target_location, quantity_issued, purpose_milestone, issued_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          project_id=VALUES(project_id),
          target_location=VALUES(target_location),
          quantity_issued=VALUES(quantity_issued),
          purpose_milestone=VALUES(purpose_milestone),
          issued_by=VALUES(issued_by)`,
        [
          dsp.log_code, dsp.material_id, dsp.project_id, dsp.target_location, dsp.quantity_issued, dsp.purpose_milestone, dsp.issued_by
        ]
      );
    }
    console.log(`✅ Seeded ${demoDispatches.length} dispatch logs for Skyhigh Meadows!`);

    // 6. Insert Financial Installments & Transactions for Sold Plots
    const demoTransactions = [
      {
        transaction_code: 'tx-sky-001',
        plot_id: 'pin-sky-101',
        project_id: projectCode,
        user_id: 'usr-admin-01',
        buyer_name: 'Rajesh & Sunita Verma',
        milestone_name: 'Token & Booking Advance',
        amount: 500000.00,
        payment_mode: 'BANK_TRANSFER',
        reference_no: 'HDFC-NEFT-9908123',
        receipt_no: 'REC-SKY-1001',
        payment_date: '2026-08-15',
        notes: 'Initial booking advance received for Plot P-101 (Sector A).'
      },
      {
        transaction_code: 'tx-sky-002',
        plot_id: 'pin-sky-101',
        project_id: projectCode,
        user_id: 'usr-admin-01',
        buyer_name: 'Rajesh & Sunita Verma',
        milestone_name: 'Foundation & Land Layout Allotment',
        amount: 2000000.00,
        payment_mode: 'CHEQUE',
        reference_no: 'CHQ-881023-SBI',
        receipt_no: 'REC-SKY-1002',
        payment_date: '2026-09-10',
        notes: 'Second installment paid for Plot P-101.'
      },
      {
        transaction_code: 'tx-sky-003',
        plot_id: 'pin-sky-103',
        project_id: projectCode,
        user_id: 'usr-admin-01',
        buyer_name: 'Dr. Meenakshi Sundaram',
        milestone_name: 'Full One-Time Payment',
        amount: 8160000.00,
        payment_mode: 'RTGS',
        reference_no: 'ICICI-RTGS-772901',
        receipt_no: 'REC-SKY-1003',
        payment_date: '2026-07-20',
        notes: 'Full payment received for 40x60 ft Villa Plot P-103.'
      }
    ];

    for (const tx of demoTransactions) {
      await dbPool.query(
        `INSERT INTO plot_manage_transactions (
          transaction_code, plot_id, project_id, user_id, buyer_name, milestone_name, amount, payment_mode, reference_no, receipt_no, payment_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          project_id=VALUES(project_id),
          buyer_name=VALUES(buyer_name),
          amount=VALUES(amount),
          payment_mode=VALUES(payment_mode),
          reference_no=VALUES(reference_no),
          receipt_no=VALUES(receipt_no),
          payment_date=VALUES(payment_date),
          notes=VALUES(notes)`,
        [
          tx.transaction_code, tx.plot_id, tx.project_id, tx.user_id, tx.buyer_name, tx.milestone_name, tx.amount, tx.payment_mode, tx.reference_no, tx.receipt_no, tx.payment_date, tx.notes
        ]
      );
    }
    console.log(`✅ Seeded ${demoTransactions.length} financial transactions for Skyhigh Meadows!`);

    console.log('🎉 ALL DEMO DATA SUCCESSFULLY INSERTED INTO MYSQL FOR SKYHIGH MEADOWS!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding demo data:', err);
    process.exit(1);
  }
}

seedSkyhighMeadowsData();
