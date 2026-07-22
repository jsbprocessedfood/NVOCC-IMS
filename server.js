/*
  NVOCC IMS - Real-Time Sync Server
  Node.js + Express + WebSocket Backend
  Enables instant multi-user synchronization across 30-40 concurrent users
*/

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = process.env.PORT || 8080;
const DB_FILE = path.join(__dirname, 'invoices_database.json');
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const SYNC_BATCH_SIZE = 50; // Process changes in batches

// ============================================================================
// INITIALIZE EXPRESS & HTTP SERVER
// ============================================================================

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname)); // Serve static files (HTML, CSS, JS)

// ============================================================================
// IN-MEMORY STATE MANAGEMENT
// ============================================================================

let invoiceDatabase = {};
let connectedUsers = new Map(); // { sessionId: { ws, username, lastActivity } }
let syncQueue = []; // Queue of pending sync events
let broadcastInProgress = false;

// Load database on startup
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      invoiceDatabase = JSON.parse(data);
      console.log(`✅ Database loaded: ${Object.keys(invoiceDatabase).length} invoices`);
    } else {
      console.log('📝 Creating new database file...');
      invoiceDatabase = {};
      saveDatabase();
    }
  } catch (err) {
    console.error('❌ Error loading database:', err.message);
    invoiceDatabase = {};
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(invoiceDatabase, null, 2), 'utf8');
    console.log(`💾 Database saved (${Object.keys(invoiceDatabase).length} invoices)`);
  } catch (err) {
    console.error('❌ Error saving database:', err.message);
  }
}

// ============================================================================
// REAL-TIME SYNC ENGINE (WebSocket)
// ============================================================================

function broadcast(event, data, excludeSessionId = null) {
  if (broadcastInProgress) {
    syncQueue.push({ event, data, excludeSessionId });
    return;
  }

  broadcastInProgress = true;
  const message = JSON.stringify({ type: event, payload: data, timestamp: new Date().toISOString() });
  let sentCount = 0;

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      const sessionId = client.sessionId;
      if (!excludeSessionId || sessionId !== excludeSessionId) {
        try {
          client.send(message);
          sentCount++;
        } catch (err) {
          console.error(`❌ Broadcast error for ${sessionId}:`, err.message);
        }
      }
    }
  });

  broadcastInProgress = false;
  console.log(`📡 Broadcasted ${event} to ${sentCount} clients`);

  // Process queued events
  if (syncQueue.length > 0) {
    const nextEvent = syncQueue.shift();
    broadcast(nextEvent.event, nextEvent.data, nextEvent.excludeSessionId);
  }
}

// ============================================================================
// WebSocket Connection Handler
// ============================================================================

wss.on('connection', (ws) => {
  const sessionId = uuidv4();
  ws.sessionId = sessionId;
  ws.username = null;
  ws.isAlive = true;

  console.log(`🔗 New connection: ${sessionId}`);

  // Heartbeat to detect disconnections
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // ========================================================================
  // MESSAGE HANDLER
  // ========================================================================

  ws.on('message', (rawMessage) => {
    try {
      const message = JSON.parse(rawMessage);
      const { type, payload } = message;

      switch (type) {
        // --- AUTHENTICATION ---
        case 'AUTH':
          handleAuth(ws, payload, sessionId);
          break;

        // --- INVOICE OPERATIONS ---
        case 'SAVE_INVOICE':
          handleSaveInvoice(ws, payload, sessionId);
          break;

        case 'DELETE_INVOICE':
          handleDeleteInvoice(ws, payload, sessionId);
          break;

        case 'FETCH_ALL':
          handleFetchAll(ws);
          break;

        case 'SYNC_REQUEST':
          handleSyncRequest(ws, payload);
          break;

        // --- PING/PONG ---
        case 'PING':
          ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
          break;

        default:
          console.warn(`⚠️ Unknown message type: ${type}`);
      }
    } catch (err) {
      console.error('❌ Message processing error:', err.message);
      ws.send(JSON.stringify({
        type: 'ERROR',
        payload: { message: 'Invalid message format' }
      }));
    }
  });

  // ========================================================================
  // DISCONNECTION HANDLER
  // ========================================================================

  ws.on('close', () => {
    if (connectedUsers.has(sessionId)) {
      const user = connectedUsers.get(sessionId);
      connectedUsers.delete(sessionId);
      console.log(`❌ Disconnected: ${user.username || sessionId} (${connectedUsers.size} users online)`);
      
      broadcast('USER_LEFT', {
        username: user.username,
        totalUsers: connectedUsers.size,
        timestamp: new Date().toISOString()
      });
    }
  });

  ws.on('error', (error) => {
    console.error(`❌ WebSocket error (${sessionId}):`, error.message);
  });
});

// ========================================================================
// HANDLER FUNCTIONS
// ========================================================================

function handleAuth(ws, payload, sessionId) {
  const { username } = payload;

  if (!username || username.trim().length === 0) {
    ws.send(JSON.stringify({
      type: 'AUTH_FAILED',
      payload: { message: 'Username required' }
    }));
    return;
  }

  ws.username = username.trim();
  connectedUsers.set(sessionId, {
    ws,
    username: ws.username,
    lastActivity: new Date(),
    sessionId
  });

  // Send auth success
  ws.send(JSON.stringify({
    type: 'AUTH_SUCCESS',
    payload: {
      sessionId,
      username: ws.username,
      totalUsers: connectedUsers.size,
      timestamp: new Date().toISOString()
    }
  }));

  console.log(`✅ Authenticated: ${ws.username} (${connectedUsers.size} users online)`);

  // Broadcast user joined
  broadcast('USER_JOINED', {
    username: ws.username,
    totalUsers: connectedUsers.size,
    timestamp: new Date().toISOString()
  });

  // Send current database to new user
  ws.send(JSON.stringify({
    type: 'FULL_SYNC',
    payload: invoiceDatabase
  }));
}

function handleSaveInvoice(ws, payload, sessionId) {
  if (!ws.username) {
    ws.send(JSON.stringify({
      type: 'ERROR',
      payload: { message: 'Not authenticated' }
    }));
    return;
  }

  const { invNo, invoiceData } = payload;

  if (!invNo || !invoiceData) {
    ws.send(JSON.stringify({
      type: 'ERROR',
      payload: { message: 'Invalid invoice data' }
    }));
    return;
  }

  // Save invoice
  invoiceDatabase[invNo] = {
    ...invoiceData,
    savedAt: new Date().toISOString(),
    savedBy: ws.username
  };

  // Persist to disk
  saveDatabase();

  // Send confirmation to sender
  ws.send(JSON.stringify({
    type: 'INVOICE_SAVED',
    payload: { invNo, timestamp: new Date().toISOString() }
  }));

  // Broadcast to all other users
  broadcast('INVOICE_UPDATED', {
    invNo,
    invoice: invoiceDatabase[invNo],
    changedBy: ws.username,
    timestamp: new Date().toISOString()
  }, sessionId);

  console.log(`💾 Invoice saved: ${invNo} by ${ws.username}`);
}

function handleDeleteInvoice(ws, payload, sessionId) {
  if (!ws.username) {
    ws.send(JSON.stringify({
      type: 'ERROR',
      payload: { message: 'Not authenticated' }
    }));
    return;
  }

  const { invNo } = payload;

  if (!invNo || !invoiceDatabase[invNo]) {
    ws.send(JSON.stringify({
      type: 'ERROR',
      payload: { message: 'Invoice not found' }
    }));
    return;
  }

  // Delete invoice
  delete invoiceDatabase[invNo];
  saveDatabase();

  // Send confirmation
  ws.send(JSON.stringify({
    type: 'INVOICE_DELETED',
    payload: { invNo, timestamp: new Date().toISOString() }
  }));

  // Broadcast deletion
  broadcast('INVOICE_DELETED_SYNC', {
    invNo,
    deletedBy: ws.username,
    timestamp: new Date().toISOString()
  }, sessionId);

  console.log(`🗑️ Invoice deleted: ${invNo} by ${ws.username}`);
}

function handleFetchAll(ws) {
  ws.send(JSON.stringify({
    type: 'FULL_SYNC',
    payload: invoiceDatabase
  }));

  console.log(`📤 Full database sent to ${ws.username || ws.sessionId}`);
}

function handleSyncRequest(ws, payload) {
  const { lastSyncId } = payload;
  // For now, send full database (can be optimized with delta sync later)
  ws.send(JSON.stringify({
    type: 'FULL_SYNC',
    payload: invoiceDatabase
  }));
}

// ========================================================================
// REST API ENDPOINTS
// ========================================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    connectedUsers: connectedUsers.size,
    invoices: Object.keys(invoiceDatabase).length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Load database (REST fallback)
app.get('/api/load-db', (req, res) => {
  res.json(invoiceDatabase);
});

// Save database (REST fallback)
app.post('/api/save-db', (req, res) => {
  try {
    const newData = req.body;

    if (typeof newData !== 'object' || Array.isArray(newData)) {
      return res.status(400).json({ error: 'Invalid database format' });
    }

    invoiceDatabase = newData;
    saveDatabase();

    res.json({
      success: true,
      message: `Database saved (${Object.keys(invoiceDatabase).length} invoices)`,
      timestamp: new Date().toISOString()
    });

    // Broadcast changes to all WebSocket clients
    broadcast('FULL_SYNC_TRIGGERED', {
      source: 'REST_API',
      count: Object.keys(invoiceDatabase).length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single invoice
app.get('/api/invoice/:invNo', (req, res) => {
  const { invNo } = req.params;
  const invoice = invoiceDatabase[invNo];

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  res.json(invoice);
});

// Delete invoice
app.delete('/api/invoice/:invNo', (req, res) => {
  const { invNo } = req.params;

  if (!invoiceDatabase[invNo]) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  delete invoiceDatabase[invNo];
  saveDatabase();

  res.json({
    success: true,
    message: `Invoice ${invNo} deleted`,
    timestamp: new Date().toISOString()
  });

  broadcast('INVOICE_DELETED_SYNC', {
    invNo,
    deletedBy: 'REST_API',
    timestamp: new Date().toISOString()
  });
});

// Get statistics
app.get('/api/stats', (req, res) => {
  const invoices = Object.values(invoiceDatabase);
  let totalTaxable = 0;
  let totalIGST = 0;
  let totalRevenue = 0;

  invoices.forEach(inv => {
    if (inv.items && Array.isArray(inv.items)) {
      inv.items.forEach(item => {
        const qty = parseFloat(item.qty) || 0;
        const rate = parseFloat(item.rate) || 0;
        const exRate = parseFloat(item.exRate) || 1;
        const igstRate = parseFloat(item.igstRate) || 0;
        const isComm = inv.isCommercial;

        const taxAmt = qty * rate * (isComm ? 1 : (exRate > 0 ? exRate : 1));
        const igstAmt = isComm ? 0 : taxAmt * (igstRate / 100);

        totalTaxable += taxAmt;
        totalIGST += igstAmt;
        totalRevenue += (taxAmt + igstAmt);
      });
    }
  });

  res.json({
    totalInvoices: invoices.length,
    totalTaxable: totalTaxable.toFixed(2),
    totalIGST: totalIGST.toFixed(2),
    totalRevenue: totalRevenue.toFixed(2),
    connectedUsers: connectedUsers.size,
    timestamp: new Date().toISOString()
  });
});

// ========================================================================
// HEARTBEAT & CLEANUP
// ========================================================================

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

server.on('close', () => {
  clearInterval(heartbeatInterval);
});

// ========================================================================
// STARTUP
// ========================================================================

loadDatabase();

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                   NVOCC IMS SYNC SERVER                        ║
║                  Real-Time Multi-User Invoice                  ║
║                    Management System v2.0                      ║
╚════════════════════════════════════════════════════════════════╝

✅ Server running on http://localhost:${PORT}
📡 WebSocket: ws://localhost:${PORT}
🗂️  Database: ${DB_FILE}
📊 Database: ${Object.keys(invoiceDatabase).length} invoices loaded

🚀 Ready for connections!
Press Ctrl+C to stop

═══════════════════════════════════════════════════════════════════
  `);

  // Log server stats every 60 seconds
  setInterval(() => {
    console.log(`📊 [${new Date().toLocaleTimeString()}] Users: ${connectedUsers.size} | Invoices: ${Object.keys(invoiceDatabase).length}`);
  }, 60000);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  saveDatabase();
  process.exit(0);
});
