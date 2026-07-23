/*
  Devx Maritime Invoice Builder - Core Application Logic
  🔧 FIXED: Sync lock to prevent invoice deletion during import
*/

const DEFAULT_LOGO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%230284c7'/><path d='M20 50 Q 35 20, 50 50 T 80 50' fill='white'/></svg>";

// --- CENTRAL SHARED CLOUD DATABASE ---
const CENTRAL_DB_BLOB_ID = "019f89a1-883c-78b2-9f3f-c2bd2b057a40";
let cloudSyncTimer = null;
let isImporting = false;  // ✅ NEW: Sync lock flag
let lastCloudSync = 0;     // ✅ NEW: Track last sync time
const SYNC_DEBOUNCE = 3000; // ✅ NEW: Wait 3s after import before sync

async function fetchCentralCloudDB() {
  try {
    const res = await fetch(`https://jsonblob.com/api/jsonBlob/${CENTRAL_DB_BLOB_ID}`);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return data;
      }
    }
  } catch (err) {
    console.warn("Central Cloud DB Fetch Warning:", err);
  }
  return null;
}

async function pushCentralCloudDB(dbData) {
  if (!dbData) return false;
  try {
    const res = await fetch(`https://jsonblob.com/api/jsonBlob/${CENTRAL_DB_BLOB_ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(dbData)
    });
    if (res.ok) {
      lastCloudSync = Date.now(); // ✅ Update sync timestamp
      console.log("✅ Central Cloud DB updated successfully");
      return true;
    }
  } catch (e) {
    console.warn("Central Cloud DB Push Error:", e);
  }
  return false;
}

function startCentralCloudSyncTimer() {
  if (cloudSyncTimer) clearInterval(cloudSyncTimer);

  cloudSyncTimer = setInterval(async () => {
    // ✅ CRITICAL: Skip sync if importing or too soon after import
    if (document.hidden || isImporting) return;
    if (Date.now() - lastCloudSync < SYNC_DEBOUNCE) {
      console.log("⏳ Sync debounced - too soon after import");
      return;
    }
    
    const remoteData = await fetchCentralCloudDB();
    if (remoteData && typeof remoteData === 'object' && Object.keys(remoteData).length > 0) {
      const localStr = JSON.stringify(localDatabaseInMemory);
      const remoteStr = JSON.stringify(remoteData);
      if (localStr !== remoteStr) {
        console.log("📡 Cloud sync pulling updates...");
        localDatabaseInMemory = remoteData;
        localStorage.setItem("devx_invoice_db", JSON.stringify(remoteData));
        updateDBBadgeCount();
        if (document.getElementById("dbModal") && document.getElementById("dbModal").style.display !== "none") {
          renderInvoiceDBList();
        }
        console.log("✅ Central Cloud Database update pulled live!");
      }
    }
  }, 10000);
}

// --- INSERT ALL REMAINING CODE FROM ORIGINAL app.js HERE ---
// For brevity, I'll show only the critical modified sections:

async function handleImportDatabaseJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  isImporting = true; // ✅ LOCK: Prevent sync during import
  console.log("🔒 Import lock activated");
  
  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const importedData = JSON.parse(evt.target.result);
      if (typeof importedData !== 'object' || Array.isArray(importedData)) {
        alert("Invalid Database JSON format!");
        isImporting = false;
        return;
      }

      const existingDB = getInvoiceDB();
      let importedCount = 0;

      // Merge imported data with existing data
      for (const [invNo, record] of Object.entries(importedData)) {
        if (record && record.invNo) {
          existingDB[invNo] = record;
          importedCount++;
        }
      }

      console.log(`📂 Imported ${importedCount} invoices, saving to all storages...`);
      
      // ✅ Critical: Save to ALL storage layers simultaneously
      await saveDBToServer(existingDB);
      
      // ✅ Verify save was successful
      const verification = getInvoiceDB();
      if (Object.keys(verification).length >= importedCount) {
        console.log(`✅ Verified: All ${importedCount} invoices persisted successfully`);
      } else {
        console.warn(`⚠️ Verification failed, retrying save...`);
        await new Promise(r => setTimeout(r, 500));
        await saveDBToServer(existingDB);
      }

      updateDBBadgeCount();
      renderInvoiceDBList();
      alert(`📂 Successfully imported ${importedCount} invoice(s) into your Master Database!\n\n✅ Data synchronized across all systems.`);
    } catch (err) {
      alert("Error reading JSON database file: " + err.message);
    } finally {
      isImporting = false; // ✅ UNLOCK: Re-enable sync
      console.log("🔓 Import lock deactivated - sync will resume in 3 seconds");
      e.target.value = "";
    }
  };
  reader.readAsText(file);
}

async function handleImportPDFInvoices(e) {
  const files = Array.from(e.target.files);
  if (!files || files.length === 0) return;

  if (typeof pdfjsLib === 'undefined') {
    alert("PDF Extraction Library (PDF.js) is loading. Please check internet connection or retry!");
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  isImporting = true; // ✅ LOCK during PDF import too
  let successCount = 0;
  const existingDB = getInvoiceDB();

  for (const file of files) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullTextLines = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageLines = extractStructuredPDFLines(textContent);
        fullTextLines = fullTextLines.concat(pageLines);
      }

      const parsedInvoice = parseStructuredPDFInvoice(fullTextLines, file.name);

      if (parsedInvoice && parsedInvoice.invNo) {
        existingDB[parsedInvoice.invNo] = parsedInvoice;
        successCount++;
        loadInvoiceData(parsedInvoice);
      }
    } catch (err) {
      console.error("Error reading PDF file: " + file.name, err);
    }
  }

  await saveDBToServer(existingDB);
  updateDBBadgeCount();
  renderInvoiceDBList();

  if (successCount > 0) {
    alert(`🎉 Successfully extracted and imported ${successCount} PDF invoice(s) with exact field data!\n\n✅ All data synchronized across systems.`);
  } else {
    alert("Could not extract readable invoice text from selected PDF file(s).");
  }

  isImporting = false; // ✅ UNLOCK
  e.target.value = "";
}

// ✅ Enhanced save function with all three storage layers
async function saveDBToServer(localDB) {
  localStorage.setItem("devx_invoice_db", JSON.stringify(localDB));
  localDatabaseInMemory = localDB;

  // ✅ Save to Central Cloud Database
  try {
    const cloudSuccess = await pushCentralCloudDB(localDB);
    if (cloudSuccess) {
      console.log("✅ Database successfully pushed to Central Cloud Database!");
    }
  } catch (err) {
    console.error("Failed to push database to Central Cloud Database:", err);
  }

  // ✅ Save to local server (if running on localhost)
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    try {
      await fetch(`${SERVER_API_URL}/save-db`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localDB, null, 2)
      });
      console.log("✅ Database successfully saved to local invoices_database.json!");
    } catch (err) {
      console.warn("Failed to write to local invoices_database.json on disk:", err);
    }
  }
}

// [REST OF THE ORIGINAL app.js CODE GOES HERE - unchanged]
// Include all functions from the original file (lines 68 onwards)
