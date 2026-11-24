const fs = require('fs');

const serverJsPath = 'C:/Users/vgt24/.gemini/antigravity/scratch/society_sync_backend/src/server.js';
let code = fs.readFileSync(serverJsPath, 'utf8');

// Agent API endpoints block
const agentEndpoints = `
// 10. AGENT MANAGEMENT MODULE ENDPOINTS
app.get('/api/agents', async (req, res) => {
  const targetUserId = req.query.userId || '';
  try {
    let query = \`
      SELECT 
        a.id as auto_id,
        a.agent_code as id,
        a.user_id,
        a.name,
        a.agency_name,
        a.phone,
        a.email,
        a.commission_rate,
        a.address,
        a.status,
        a.created_at,
        COUNT(p.id) as deals_count,
        COALESCE(SUM(p.sq_ft * p.base_rate * IF(p.is_corner = 1, 1.10, 1.0)), 0) as total_sales_volume,
        COALESCE(SUM(p.agent_commission_amount), 0) as total_commission_earned
      FROM plot_manage_agents a
      LEFT JOIN plot_manage_pins p ON (p.agent_id = a.agent_code OR p.agent_id = CAST(a.id AS CHAR)) AND p.status IN ('SOLD', 'BOOKED', 'RESERVED')
    \`;
    const params = [];
    if (targetUserId) {
      query += \` WHERE a.user_id = ? OR a.user_id = (SELECT user_code FROM plot_manage_users WHERE id = ? OR user_code = ?)\`;
      params.push(targetUserId, isNaN(targetUserId) ? -1 : parseInt(targetUserId), targetUserId);
    }
    query += \` GROUP BY a.id ORDER BY a.id DESC\`;

    const [rows] = await dbPool.query(query, params);
    const agents = rows.map(r => ({
      id: r.id,
      autoId: r.auto_id,
      userId: r.user_id,
      name: r.name,
      agencyName: r.agency_name || 'Independent Broker',
      phone: r.phone,
      email: r.email || \`\${r.phone}@agent.com\`,
      commissionRate: parseFloat(r.commission_rate || 2.5),
      address: r.address || '',
      status: r.status || 'ACTIVE',
      createdAt: r.created_at,
      dealsCount: parseInt(r.deals_count || 0),
      totalSalesVolume: parseFloat(r.total_sales_volume || 0),
      totalCommissionEarned: parseFloat(r.total_commission_earned || 0)
    }));

    return res.json({ success: true, agents });
  } catch (err) {
    console.error('MySQL GET /api/agents error:', err.message);
    return res.status(500).json({ success: false, message: err.message, agents: [] });
  }
});

app.post('/api/agents', async (req, res) => {
  const { userId, name, agencyName, phone, email, commissionRate, address, status } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Agent name and phone number are required.' });
  }

  const agentCode = \`agt-\${Date.now()}\`;
  const targetUserId = userId || 'usr-admin-01';
  const rate = parseFloat(commissionRate) || 2.5;

  try {
    const [result] = await dbPool.query(
      \`INSERT INTO plot_manage_agents (agent_code, user_id, name, agency_name, phone, email, commission_rate, address, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
      [
        agentCode,
        targetUserId,
        name.trim(),
        agencyName ? agencyName.trim() : 'Independent Broker',
        phone.trim(),
        email ? email.trim() : null,
        rate,
        address ? address.trim() : null,
        status || 'ACTIVE'
      ]
    );

    const newAgent = {
      id: agentCode,
      autoId: result.insertId,
      userId: targetUserId,
      name: name.trim(),
      agencyName: agencyName ? agencyName.trim() : 'Independent Broker',
      phone: phone.trim(),
      email: email ? email.trim() : '',
      commissionRate: rate,
      address: address || '',
      status: status || 'ACTIVE',
      dealsCount: 0,
      totalSalesVolume: 0,
      totalCommissionEarned: 0
    };

    console.log(\`🤝 [AGENT REGISTERED] Registered agent '\${name}' with code \${agentCode} (Auto ID: \${result.insertId}, Rate: \${rate}%)\`);
    return res.status(201).json({ success: true, message: \`Agent '\${name}' registered successfully!\`, agent: newAgent });
  } catch (err) {
    console.error('MySQL POST /api/agents error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/agents/:id', async (req, res) => {
  const agentId = req.params.id;
  const { name, agencyName, phone, email, commissionRate, address, status } = req.body;

  try {
    await dbPool.query(
      \`UPDATE plot_manage_agents 
       SET name = ?, agency_name = ?, phone = ?, email = ?, commission_rate = ?, address = ?, status = ?
       WHERE agent_code = ? OR id = ?\`,
      [
        name,
        agencyName || 'Independent Broker',
        phone,
        email || null,
        parseFloat(commissionRate) || 2.5,
        address || null,
        status || 'ACTIVE',
        agentId,
        isNaN(agentId) ? -1 : parseInt(agentId)
      ]
    );

    return res.json({ success: true, message: \`Agent '\${name}' updated successfully!\` });
  } catch (err) {
    console.error('MySQL PUT /api/agents error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/agents/:id', async (req, res) => {
  const agentId = req.params.id;
  try {
    await dbPool.query(
      \`DELETE FROM plot_manage_agents WHERE agent_code = ? OR id = ?\`,
      [agentId, isNaN(agentId) ? -1 : parseInt(agentId)]
    );

    return res.json({ success: true, message: 'Agent deleted successfully!' });
  } catch (err) {
    console.error('MySQL DELETE /api/agents error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});
`;

if (!code.includes('/api/agents')) {
  code = code.replace("app.get('/health'", agentEndpoints + "\napp.get('/health'");
}

// 2. Update save-layout query to insert sourcing fields
const oldSaveLayoutInsert = `INSERT INTO plot_manage_pins (pin_code, project_id, user_id, plot_number, sector_name, pos_x, pos_y, dimensions, sq_ft, base_rate, facing_direction, status, buyer_name, buyer_phone, buyer_email, buyer_id_proof, payment_plan, allotted_date, token_amount, paid_amount, is_corner)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           project_id = VALUES(project_id),
           user_id = VALUES(user_id),
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
           buyer_id_proof = VALUES(buyer_id_proof),
           payment_plan = VALUES(payment_plan),
           allotted_date = VALUES(allotted_date),
           token_amount = VALUES(token_amount),
           paid_amount = VALUES(paid_amount),
           is_corner = VALUES(is_corner)`;

const newSaveLayoutInsert = `INSERT INTO plot_manage_pins (pin_code, project_id, user_id, plot_number, sector_name, pos_x, pos_y, dimensions, sq_ft, base_rate, facing_direction, status, buyer_name, buyer_phone, buyer_email, buyer_id_proof, payment_plan, allotted_date, token_amount, paid_amount, is_corner, sourcing_type, agent_id, agent_name, agent_phone, agent_commission_pct, agent_commission_amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           project_id = VALUES(project_id),
           user_id = VALUES(user_id),
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
           buyer_id_proof = VALUES(buyer_id_proof),
           payment_plan = VALUES(payment_plan),
           allotted_date = VALUES(allotted_date),
           token_amount = VALUES(token_amount),
           paid_amount = VALUES(paid_amount),
           is_corner = VALUES(is_corner),
           sourcing_type = VALUES(sourcing_type),
           agent_id = VALUES(agent_id),
           agent_name = VALUES(agent_name),
           agent_phone = VALUES(agent_phone),
           agent_commission_pct = VALUES(agent_commission_pct),
           agent_commission_amount = VALUES(agent_commission_amount)`;

code = code.replace(oldSaveLayoutInsert, newSaveLayoutInsert);

// Update save-layout parameters array
const oldSaveLayoutParams = `parseFloat(pin.tokenAmount) || 0,
            parseFloat(pin.paidAmount) || 0,
            pin.isCorner ? 1 : 0
          ]`;

const newSaveLayoutParams = `parseFloat(pin.tokenAmount) || 0,
            parseFloat(pin.paidAmount) || 0,
            pin.isCorner ? 1 : 0,
            pin.sourcingType || 'DIRECT',
            pin.agentId || null,
            pin.agentName || null,
            pin.agentPhone || null,
            parseFloat(pin.agentCommissionPct) || 0,
            parseFloat(pin.agentCommissionAmount) || 0
          ]`;

code = code.replace(oldSaveLayoutParams, newSaveLayoutParams);

// 3. Update pin mapper in GET /api/plots/layout
const oldPinMapper = `paidAmount: parseFloat(p.paid_amount || 0),
        isCorner: Boolean(p.is_corner)
      }))`;

const newPinMapper = `paidAmount: parseFloat(p.paid_amount || 0),
        isCorner: Boolean(p.is_corner),
        sourcingType: p.sourcing_type || 'DIRECT',
        agentId: p.agent_id || null,
        agentName: p.agent_name || null,
        agentPhone: p.agent_phone || null,
        agentCommissionPct: parseFloat(p.agent_commission_pct || 0),
        agentCommissionAmount: parseFloat(p.agent_commission_amount || 0)
      }))`;

code = code.replaceAll(oldPinMapper, newPinMapper);

// 4. Update GET /api/customers query & mapper
const oldCustSelect = `p.allotted_date,
        p.token_amount,
        p.paid_amount,
        p.created_at`;

const newCustSelect = `p.allotted_date,
        p.token_amount,
        p.paid_amount,
        p.sourcing_type,
        p.agent_id,
        p.agent_name,
        p.agent_phone,
        p.agent_commission_pct,
        p.agent_commission_amount,
        p.created_at`;

code = code.replace(oldCustSelect, newCustSelect);

const oldCustReturn = `paidAmount: parseFloat(r.paid_amount) > 0 ? parseFloat(r.paid_amount) : defaultPaid,
        balanceDue: totalValuation - (parseFloat(r.paid_amount) > 0 ? parseFloat(r.paid_amount) : defaultPaid)
      };`;

const newCustReturn = `paidAmount: parseFloat(r.paid_amount) > 0 ? parseFloat(r.paid_amount) : defaultPaid,
        balanceDue: totalValuation - (parseFloat(r.paid_amount) > 0 ? parseFloat(r.paid_amount) : defaultPaid),
        sourcingType: r.sourcing_type || 'DIRECT',
        agentId: r.agent_id || null,
        agentName: r.agent_name || null,
        agentPhone: r.agent_phone || null,
        agentCommissionPct: parseFloat(r.agent_commission_pct || 0),
        agentCommissionAmount: parseFloat(r.agent_commission_amount || 0)
      };`;

code = code.replace(oldCustReturn, newCustReturn);

// 5. Update POST /api/plots/book
const oldBookQuery = `await dbPool.query(
      \`UPDATE plot_manage_pins SET status = 'SOLD', buyer_name = ?, buyer_phone = ?, buyer_email = ?, buyer_id_proof = ?, payment_plan = ?, allotted_date = ?, token_amount = ?, paid_amount = ? WHERE pin_code = ? OR id = ? OR plot_number = ?\`,
      [buyerName, buyerPhone, buyerEmail || null, buyerIdProof || 'Aadhaar Verified', paymentPlan || 'MILESTONE', allDate, parseFloat(tokenAmount) || 100000, parseFloat(paidAmount) || 500000, plotId, isNaN(plotId) ? -1 : parseInt(plotId), plotId]
    );`;

const newBookQuery = `const { sourcingType, agentId, agentName, agentPhone, agentCommissionPct, agentCommissionAmount } = req.body;
    await dbPool.query(
      \`UPDATE plot_manage_pins SET status = 'SOLD', buyer_name = ?, buyer_phone = ?, buyer_email = ?, buyer_id_proof = ?, payment_plan = ?, allotted_date = ?, token_amount = ?, paid_amount = ?, sourcing_type = ?, agent_id = ?, agent_name = ?, agent_phone = ?, agent_commission_pct = ?, agent_commission_amount = ? WHERE pin_code = ? OR id = ? OR plot_number = ?\`,
      [
        buyerName, 
        buyerPhone, 
        buyerEmail || null, 
        buyerIdProof || 'Aadhaar Verified', 
        paymentPlan || 'MILESTONE', 
        allDate, 
        parseFloat(tokenAmount) || 100000, 
        parseFloat(paidAmount) || 500000, 
        sourcingType || 'DIRECT',
        agentId || null,
        agentName || null,
        agentPhone || null,
        parseFloat(agentCommissionPct) || 0,
        parseFloat(agentCommissionAmount) || 0,
        plotId, 
        isNaN(plotId) ? -1 : parseInt(plotId), 
        plotId
      ]
    );`;

code = code.replace(oldBookQuery, newBookQuery);

// 6. Update POST /api/plots/hold
const oldHoldQuery = `await dbPool.query(
      \`UPDATE plot_manage_pins SET status = 'RESERVED', buyer_name = ?, buyer_phone = ?, buyer_email = ?, payment_plan = '24-HR TOKEN HOLD', allotted_date = CURDATE(), token_amount = ? WHERE pin_code = ? OR id = ? OR plot_number = ?\`,
      [buyerName || 'Interested Buyer', buyerPhone || '', buyerEmail || null, parseFloat(tokenAmount) || 50000, plotId, isNaN(plotId) ? -1 : parseInt(plotId), plotId]
    );`;

const newHoldQuery = `const { sourcingType, agentId, agentName, agentPhone, agentCommissionPct, agentCommissionAmount } = req.body;
    await dbPool.query(
      \`UPDATE plot_manage_pins SET status = 'RESERVED', buyer_name = ?, buyer_phone = ?, buyer_email = ?, payment_plan = '24-HR TOKEN HOLD', allotted_date = CURDATE(), token_amount = ?, sourcing_type = ?, agent_id = ?, agent_name = ?, agent_phone = ?, agent_commission_pct = ?, agent_commission_amount = ? WHERE pin_code = ? OR id = ? OR plot_number = ?\`,
      [
        buyerName || 'Interested Buyer', 
        buyerPhone || '', 
        buyerEmail || null, 
        parseFloat(tokenAmount) || 50000, 
        sourcingType || 'DIRECT',
        agentId || null,
        agentName || null,
        agentPhone || null,
        parseFloat(agentCommissionPct) || 0,
        parseFloat(agentCommissionAmount) || 0,
        plotId, 
        isNaN(plotId) ? -1 : parseInt(plotId), 
        plotId
      ]
    );`;

code = code.replace(oldHoldQuery, newHoldQuery);

fs.writeFileSync(serverJsPath, code);
console.log('Successfully updated server.js with Agent Management and Sourcing endpoints!');
