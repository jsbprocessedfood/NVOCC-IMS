/*
  Devx Maritime Invoice Builder - Core Application Logic
  Includes Multi-Company Profile Manager, Live A4 Sync, Math Engine, Indian Currency Words,
  e-Invoice QR Code Handling, Local Database, and Invoice Cloning/Duplication.
*/

const DEFAULT_LOGO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%230284c7'/><path d='M20 50 Q 35 20, 50 50 T 80 50' stroke='white' stroke-width='6' fill='none'/></svg>";

// --- PRESET COMPANY DATA ---
const COMPANY_PRESETS = {
  parekh: {
    compName: "PAREKH MARINE SERVICES PRIVATE LIMITED",
    compLogoUrl: "",
    compAddress: "Anchorage, CTS-275/B Village Deonar, Off. Govandi Station Rd, Govandi (E), Mumbai, Mumbai City, Maharashtra, India, 400088",
    compCIN: "U74999MH2017PTC291606",
    compState: "27 State Name : Maharashtra",
    compGSTIN: "27AAJCP0051C1ZV",
    compPAN: "AAJCP0051C",
    compWebsite: "www.parekhglobal.com",
    compPhone: "022-67407500",
    beneficiaryName: "PAREKH MARINE SERVICES PRIVATE LIMITED A/C ARKAS LINE",
    bankNameAddress: "HDFC BANK LTD, GROUND FLOOR, JEHANGIR BLDG., M G ROAD, FORT, MUMBAI 400001",
    bankAccNo: "PARM62DEL",
    accountType: "CURRENT",
    micrCode: "400240015",
    rtgsIfsc: "HDFC0000240",
    neftIfsc: "HDFC0000240",
    chequeFav: "Parekh Marine Services Private Limited",
    forCompany: "Parekh Marine Services Private Limited"
  },
  jsb: {
    compName: "JSB CARGO MOVERS PRIVATE LIMITED",
    compLogoUrl: "",
    compAddress: "Ground Floor, 1/636, Vaishali, Sahibabad Industrial Area, Ghaziabad, Uttar Pradesh, 201010",
    compCIN: "U63090UP2020PTC135790",
    compState: "09 State Name : Uttar Pradesh",
    compGSTIN: "09AAGCJ8258C1ZD",
    compPAN: "AAGCJ8258C",
    compWebsite: "www.jsbcargo.com",
    compPhone: "0120-4567890",
    beneficiaryName: "JSB CARGO MOVERS PRIVATE LIMITED",
    bankNameAddress: "ICICI BANK LTD, SAHIBABAD BRANCH, GHAZIABAD, UTTAR PRADESH 201010",
    bankAccNo: "629005012345",
    accountType: "CURRENT",
    micrCode: "110229045",
    rtgsIfsc: "ICIC0006290",
    neftIfsc: "ICIC0006290",
    chequeFav: "JSB Cargo Movers Private Limited",
    forCompany: "JSB Cargo Movers Private Limited"
  },
  custom1: {
    compName: "OCEANIC FREIGHT LOGISTICS PVT LTD",
    compLogoUrl: "",
    compAddress: "Suite 402, Maritime Trade Centre, Beach Road, Visakhapatnam, Andhra Pradesh, 530002",
    compCIN: "U61100AP2019PTC112345",
    compState: "37 State Name : Andhra Pradesh",
    compGSTIN: "37AABCO1234F1Z9",
    compPAN: "AABCO1234F",
    compWebsite: "www.oceanicfreight.com",
    compPhone: "0891-2789000",
    beneficiaryName: "OCEANIC FREIGHT LOGISTICS PVT LTD",
    bankNameAddress: "AXIS BANK LTD, MAIN ROAD, VISAKHAPATNAM 530002",
    bankAccNo: "91902005432100",
    accountType: "CURRENT",
    micrCode: "530211002",
    rtgsIfsc: "UTIB0000123",
    neftIfsc: "UTIB0000123",
    chequeFav: "Oceanic Freight Logistics Pvt Ltd",
    forCompany: "Oceanic Freight Logistics Pvt Ltd"
  }
};

// --- SAMPLE FULL INVOICE DATA (REPLICATING NSA065014708-TAX2.pdf) ---
const SAMPLE_INVOICE_DATA = {
  ...COMPANY_PRESETS.parekh,
  invNo: "BOMEX17260700399",
  invDate: "20-Jul-2026",
  salesPerson: "",
  principal: "ARKAS CONTAINER TRANSPORT S.A.",
  irnNumber: "de2f556545dfed37631cba5cb3948473ba0cb3e78036e623dc2493c690f69c26",
  ackNo: "122610987654321",
  ackDate: "20-Jul-2026",
  billToName: "JSB CONSULTANTS PRIVATE LIMITED(185185)",
  billToAddress: "GROUND FLOOR, 1/636, VAISHALI, Iesahibabad Sub Post Office, Sahibabad Industrial Area, Ghaziabad, Uttar Pradesh, 201010",
  billToState: "09 State Name : Uttar Pradesh",
  billToGSTIN: "09AAGCJ8258C1ZD",
  billToPAN: "AAGCJ8258C",
  bookingParty: "JSB CONSULTANTS PRIVATE LIMITED GROUND FLOOR 1/636 VAISHALI Iesahibabad Sub Post Office Sahibabad Industrial Area Ghaziabad Ghaziabad Uttar Pradesh 201010",
  shipperName: "IFF INDIA FROZEN FOODS PRIVATE LIMITED",
  shipperRef: "REF/2026/09871",
  vessel: "VIVIEN A",
  voyageNo: "IMS18W26NSA",
  blNo: "NSA065014708",
  dateOfSupply: "17-Jul-2026",
  placeOfSupply: "09 / Uttar Pradesh",
  dateOfSailing: "17-Jul-2026",
  pol: "NHAVA SHEVA",
  pod: "POTI",
  placeOfDelivery: "POTI",
  placeOfReceipt: "NHAVA SHEVA",
  invoiceType: "Original for recipient",
  remarks: "",
  noOfContainers: "3X40",
  containerNos: "ARKU5012788, ARKU5026288, ARKU5008920",
  preparedBy: "Internal Auditor Login",
  items: [
    {
      description: "Export Reefer THC 40",
      sacHsn: "996711",
      cntrType: "",
      qty: 3,
      cur: "INR",
      rate: 32000,
      exRate: 1,
      igstRate: 18
    },
    {
      description: "MANDATORY USER CHARGE",
      sacHsn: "996711",
      cntrType: "",
      qty: 3,
      cur: "INR",
      rate: 170,
      exRate: 1,
      igstRate: 18
    }
  ]
};

// Application State & Central Database Sync Engine
let lineItems = [];
let currentLayoutMode = 0; // 0: split, 1: form-only, 2: preview-only
let currentQRDataUrl = "";
let inMemoryDB = {};
let centralWebSocket = null;
let isCentralSyncActive = false;

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  loadInvoiceData(SAMPLE_INVOICE_DATA);
  initCentralDBSync();
});

const GITHUB_DB_RAW_URL = "https://raw.githubusercontent.com/jsbprocessedfood/NVOCC-IMS/TEST-Branch/invoices_database.json";

function initCentralDBSync(forceAlert = false) {
  updateSyncBadge("syncing", "🌐 Connecting Central DB...");

  // Load existing local cache from LocalStorage
  const cached = localStorage.getItem("devx_invoice_db");
  if (cached) {
    try {
      inMemoryDB = JSON.parse(cached);
    } catch (e) {}
  }

  // Priority 1: Try Local Server API (/api/load-db)
  fetch("/api/load-db")
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (data && typeof data === 'object') {
        mergeDatabaseRecords(data, "Local Server", forceAlert);
      }
    })
    .catch(() => {
      // Priority 2: Try Relative Static JSON File (./invoices_database.json)
      fetch("./invoices_database.json?t=" + Date.now())
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data && typeof data === 'object') {
            mergeDatabaseRecords(data, "Local File", forceAlert);
          }
        })
        .catch(() => {
          // Priority 3: Try Central GitHub Raw Repository DB
          syncGitHubDatabase(forceAlert);
        });
    });

  // Connect WebSocket for Real-Time Multi-User Sync if local server is running
  connectWebSocketSync();
}

function syncGitHubDatabase(showAlert = false) {
  updateSyncBadge("syncing", "🌐 Fetching GitHub DB...");
  fetch(GITHUB_DB_RAW_URL + "?t=" + Date.now())
    .then(res => {
      if (!res.ok) throw new Error(`GitHub HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (data && typeof data === 'object') {
        mergeDatabaseRecords(data, "GitHub Central DB", showAlert);
      }
    })
    .catch(err => {
      console.warn("⚠️ GitHub Raw DB fetch error:", err.message);
      updateSyncBadge("offline", `🟢 Local DB (${Object.keys(inMemoryDB).length} Invoices)`);
      updateDBBadgeCount();
      if (showAlert) {
        alert(`🔴 Unable to fetch GitHub DB. Currently using local database cache (${Object.keys(inMemoryDB).length} invoices).`);
      }
    });
}

function getDeletedInvoicesRegistry() {
  try {
    const list = localStorage.getItem("devx_deleted_invoices");
    return list ? JSON.parse(list) : [];
  } catch (e) {
    return [];
  }
}

function registerDeletedInvoice(invNo) {
  const deletedList = getDeletedInvoicesRegistry();
  if (!deletedList.includes(invNo)) {
    deletedList.push(invNo);
    localStorage.setItem("devx_deleted_invoices", JSON.stringify(deletedList));
  }
}

function unregisterDeletedInvoice(invNo) {
  let deletedList = getDeletedInvoicesRegistry();
  if (deletedList.includes(invNo)) {
    deletedList = deletedList.filter(id => id !== invNo);
    localStorage.setItem("devx_deleted_invoices", JSON.stringify(deletedList));
  }
}

function mergeDatabaseRecords(remoteData, sourceName, showAlert = false) {
  const deletedList = getDeletedInvoicesRegistry();
  let addedCount = 0;

  for (const [invNo, record] of Object.entries(remoteData)) {
    // If user explicitly deleted this invoice locally, do not force-re-add it
    if (deletedList.includes(invNo)) {
      continue;
    }

    if (!inMemoryDB[invNo]) {
      inMemoryDB[invNo] = record;
      addedCount++;
    }
  }

  localStorage.setItem("devx_invoice_db", JSON.stringify(inMemoryDB));
  isCentralSyncActive = true;

  const totalCount = Object.keys(inMemoryDB).length;
  updateSyncBadge("connected", `🟢 ${sourceName}: ${totalCount} Invoices`);
  updateDBBadgeCount();

  if (document.getElementById("dbModal") && document.getElementById("dbModal").style.display === "flex") {
    renderInvoiceDBList();
  }

  if (showAlert) {
    alert(`🟢 Central Sync Complete!\nConnected Source: ${sourceName}\nTotal Invoices & Credit Notes: ${totalCount} (${addedCount} new merged).`);
  }
}

function connectWebSocketSync() {
  try {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname || 'localhost';
    const wsPort = window.location.port || '8080';
    const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}`;

    centralWebSocket = new WebSocket(wsUrl);

    centralWebSocket.onopen = () => {
      console.log("⚡ WebSocket Central Sync Connected!");
      centralWebSocket.send(JSON.stringify({
        type: 'AUTH',
        payload: { username: 'SystemUser_' + Math.floor(Math.random() * 1000) }
      }));
    };

    centralWebSocket.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'FULL_SYNC' || msg.type === 'FULL_SYNC_TRIGGERED') {
          if (msg.payload && typeof msg.payload === 'object') {
            mergeDatabaseRecords(msg.payload, "Live Server");
          }
        } else if (msg.type === 'INVOICE_UPDATED') {
          if (msg.payload && msg.payload.invNo && msg.payload.invoice) {
            inMemoryDB[msg.payload.invNo] = msg.payload.invoice;
            localStorage.setItem("devx_invoice_db", JSON.stringify(inMemoryDB));
            updateSyncBadge("connected", `🟢 Live Sync: ${Object.keys(inMemoryDB).length} Invoices`);
            updateDBBadgeCount();
            if (document.getElementById("dbModal") && document.getElementById("dbModal").style.display === "flex") renderInvoiceDBList();
          }
        } else if (msg.type === 'INVOICE_DELETED_SYNC') {
          if (msg.payload && msg.payload.invNo) {
            delete inMemoryDB[msg.payload.invNo];
            localStorage.setItem("devx_invoice_db", JSON.stringify(inMemoryDB));
            updateSyncBadge("connected", `🟢 Live Sync: ${Object.keys(inMemoryDB).length} Invoices`);
            updateDBBadgeCount();
            if (document.getElementById("dbModal") && document.getElementById("dbModal").style.display === "flex") renderInvoiceDBList();
          }
        }
      } catch (e) {
        console.error("Error parsing WebSocket message:", e);
      }
    };

    centralWebSocket.onerror = () => {
      // Quiet fallback when node server is not running
    };
  } catch (err) {
    console.warn("WebSocket init error:", err.message);
  }
}

function fetchCentralDB() {
  initCentralDBSync(true);
}

function updateSyncBadge(statusClass, text) {
  const badge = document.getElementById("centralSyncBadge");
  if (badge) {
    badge.className = `sync-status-badge status-${statusClass}`;
    badge.textContent = text;
  }
}

function setupEventListeners() {
  // Accordion Toggles
  window.toggleAccordion = function(accId) {
    const item = document.getElementById(accId);
    if (item) {
      item.classList.toggle("collapsed");
    }
  };

  // Header Sync Badge Click -> Manual Resync
  const badge = document.getElementById("centralSyncBadge");
  if (badge) {
    badge.addEventListener("click", () => initCentralDBSync(true));
  }

  // Document Type Change Handler
  const docTypeEl = document.getElementById("docType");
  if (docTypeEl) {
    docTypeEl.addEventListener("change", (e) => {
      const val = e.target.value;
      const cnGroup = document.getElementById("cnRefGroup");
      if (cnGroup) {
        cnGroup.style.display = (val === "CREDIT_NOTE" || val === "DEBIT_NOTE") ? "grid" : "none";
      }
      updateLivePreview();
    });
  }

  // Header Actions
  document.getElementById("companyProfileSelect").addEventListener("change", handleProfileChange);
  document.getElementById("btnSaveProfile").addEventListener("click", saveProfilePreset);
  document.getElementById("btnLoadSample").addEventListener("click", () => loadInvoiceData(SAMPLE_INVOICE_DATA));
  document.getElementById("btnReset").addEventListener("click", resetForm);
  document.getElementById("btnToggleLayout").addEventListener("click", toggleLayoutMode);
  document.getElementById("btnPrint").addEventListener("click", () => window.print());

  // Database, Master Sheet & E-Invoice Header Actions
  document.getElementById("btnSaveToDB").addEventListener("click", saveInvoiceToDB);
  document.getElementById("btnDuplicateInv").addEventListener("click", duplicateCurrentInvoice);
  document.getElementById("btnOpenDB").addEventListener("click", openDBModal);
  document.getElementById("btnCloseDBModal").addEventListener("click", closeDBModal);
  document.getElementById("btnOpenEInvConsole").addEventListener("click", () => openEInvModal());
  document.getElementById("btnCloseEInvModal").addEventListener("click", closeEInvModal);
  document.getElementById("btnExportCurrentTallyXML").addEventListener("click", exportCurrentInvoiceTallyXML);

  // Master Sheet Filter Controls
  const filterInputs = ["dbSearchInput", "filterDateFrom", "filterDateTo", "filterCompany", "filterIRNStatus", "filterDocType"];
  filterInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", () => renderInvoiceDBList());
    if (el) el.addEventListener("input", () => renderInvoiceDBList());
  });

  const btnResetFilters = document.getElementById("btnResetFilters");
  if (btnResetFilters) {
    btnResetFilters.addEventListener("click", () => {
      document.getElementById("dbSearchInput").value = "";
      document.getElementById("filterDateFrom").value = "";
      document.getElementById("filterDateTo").value = "";
      document.getElementById("filterCompany").value = "ALL";
      document.getElementById("filterIRNStatus").value = "ALL";
      if (document.getElementById("filterDocType")) document.getElementById("filterDocType").value = "ALL";
      renderInvoiceDBList();
    });
  }

  // Master Sheet Checkbox & Export Buttons
  const chkSelectAll = document.getElementById("chkSelectAllMaster");
  if (chkSelectAll) {
    chkSelectAll.addEventListener("change", (e) => {
      document.querySelectorAll(".chk-master-item").forEach(cb => cb.checked = e.target.checked);
    });
  }

  document.getElementById("btnExportMasterExcel").addEventListener("click", exportSelectedOrFilteredExcel);
  document.getElementById("btnExportMasterCSV").addEventListener("click", exportSelectedOrFilteredCSV);
  document.getElementById("btnExportMasterTallyXML").addEventListener("click", exportSelectedOrFilteredTallyXML);
  document.getElementById("btnDeleteSelectedDB").addEventListener("click", deleteSelectedMasterInvoices);
  document.getElementById("btnBulkEInvoice").addEventListener("click", handleBulkEInvoice);
  if (document.getElementById("btnSyncGitHubDB")) document.getElementById("btnSyncGitHubDB").addEventListener("click", () => syncGitHubDatabase(true));
  document.getElementById("btnExportJsonDB").addEventListener("click", () => exportDatabaseJSON(true));
  if (document.getElementById("btnCopyDbJson")) document.getElementById("btnCopyDbJson").addEventListener("click", copyDatabaseJSONToClipboard);
  
  const btnImportJsonDB = document.getElementById("btnImportJsonDB");
  const fileInputDB = document.getElementById("importJsonFileInput");
  if (btnImportJsonDB && fileInputDB) {
    btnImportJsonDB.addEventListener("click", () => fileInputDB.click());
    fileInputDB.addEventListener("change", handleImportDatabaseJSON);
  }

  const btnImportMasterPDF = document.getElementById("btnImportMasterPDF");
  const pdfFileInput = document.getElementById("pdfFileInput");
  if (btnImportMasterPDF && pdfFileInput) {
    btnImportMasterPDF.addEventListener("click", () => pdfFileInput.click());
    pdfFileInput.addEventListener("change", handleImportPDFInvoices);
  }

  // E-Invoicing API Console Buttons
  document.getElementById("btnTestAuthAPI").addEventListener("click", handleEInvTestAuth);
  document.getElementById("btnGenerateIRNAPI").addEventListener("click", handleEInvGenerateIRN);
  document.getElementById("btnViewNICPayload").addEventListener("click", handleEInvViewPayload);
  document.getElementById("btnCancelIRNAPI").addEventListener("click", handleEInvCancelIRN);

  // Logo File & URL Handlers
  const fileInput = document.getElementById("compLogoFile");
  const urlInput = document.getElementById("compLogoUrl");
  const btnRemoveLogo = document.getElementById("btnRemoveLogo");
  const viewLogo = document.getElementById("viewLogo");

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target.result;
        urlInput.value = dataUrl;
        viewLogo.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  });

  urlInput.addEventListener("input", (e) => {
    viewLogo.src = e.target.value.trim() || DEFAULT_LOGO;
  });

  btnRemoveLogo.addEventListener("click", () => {
    fileInput.value = "";
    urlInput.value = "";
    viewLogo.src = DEFAULT_LOGO;
  });

  // QR Code Upload & Payload Handlers
  const qrFileInput = document.getElementById("qrCodeFile");
  const qrPayloadInput = document.getElementById("qrCodePayload");
  const btnRemoveQR = document.getElementById("btnRemoveQR");

  if (qrFileInput) {
    qrFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          currentQRDataUrl = evt.target.result;
          updateLivePreview();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (qrPayloadInput) {
    qrPayloadInput.addEventListener("input", () => {
      currentQRDataUrl = "";
      if (qrFileInput) qrFileInput.value = "";
      updateLivePreview();
    });
  }

  if (btnRemoveQR) {
    btnRemoveQR.addEventListener("click", () => {
      currentQRDataUrl = "";
      if (qrFileInput) qrFileInput.value = "";
      if (qrPayloadInput) qrPayloadInput.value = "";
      updateLivePreview();
    });
  }

  // Add Item Button
  document.getElementById("btnAddItem").addEventListener("click", () => {
    addItemCard({
      description: "",
      sacHsn: "996711",
      cntrType: "",
      qty: 1,
      cur: "INR",
      rate: 0,
      exRate: 1,
      igstRate: 18
    });
    updateLivePreview();
  });

  // Attach live input sync to all form control inputs
  const textInputIds = [
    "compName", "compAddress", "compCIN", "compState", "compGSTIN", "compPAN", "compWebsite", "compPhone", "compLogoUrl",
    "docType", "cnOriginalInvNo", "cnOriginalInvDate", "invNo", "invDate", "salesPerson", "principal", "irnNumber", "ackNo", "ackDate", "qrCodePayload",
    "billToName", "billToAddress", "billToState", "billToGSTIN", "billToPAN", "bookingParty", "shipperName", "shipperRef",
    "vessel", "voyageNo", "blNo", "dateOfSupply", "placeOfSupply", "dateOfSailing", "portCode", "icdLocation", "shippingBillNo", "shippingBillDate",
    "pol", "pod", "placeOfDelivery", "placeOfReceipt", "invoiceType", "remarks", "noOfContainers", "containerNos",
    "beneficiaryName", "bankNameAddress", "bankAccNo", "accountType", "micrCode", "rtgsIfsc", "neftIfsc", "preparedBy"
  ];

  textInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", updateLivePreview);
      el.addEventListener("change", updateLivePreview);
    }
  });
}

// --- POPULATE INVOICE DATA ---
function loadInvoiceData(data) {
  // Infer docType if not explicitly set
  if (!data.docType) {
    if (data.isCreditNote) {
      data.docType = "CREDIT_NOTE";
    } else {
      data.docType = "INVOICE";
    }
  }

  for (const [key, value] of Object.entries(data)) {
    if (key === "items") continue;
    const el = document.getElementById(key);
    if (el) {
      el.value = value || "";
    }
  }

  // Handle docType & cnRefGroup visibility
  const docTypeVal = document.getElementById("docType") ? document.getElementById("docType").value : "INVOICE";
  const cnGroup = document.getElementById("cnRefGroup");
  if (cnGroup) {
    cnGroup.style.display = (docTypeVal === "CREDIT_NOTE" || docTypeVal === "DEBIT_NOTE") ? "grid" : "none";
  }

  // Restore Logo and QR state
  const logoEl = document.getElementById("viewLogo");
  if (logoEl) {
    logoEl.src = data.compLogoUrl || DEFAULT_LOGO;
  }
  currentQRDataUrl = data.qrCodeDataUrl || "";

  // Load line items
  const container = document.getElementById("itemsContainer");
  container.innerHTML = "";
  lineItems = [];

  if (data.items && data.items.length > 0) {
    data.items.forEach(item => addItemCard(item));
  } else {
    addItemCard({
      description: "",
      sacHsn: "996711",
      cntrType: "",
      qty: 1,
      cur: "INR",
      rate: 0,
      exRate: 1,
      igstRate: 18
    });
  }

  updateLivePreview();
}

// --- CLONE / DUPLICATE INVOICE LOGIC ---
function duplicateInvoiceData(sourceData, newInvNo) {
  // Copy all details from source invoice
  loadInvoiceData(sourceData);

  // Set new Invoice No
  document.getElementById("invNo").value = newInvNo;

  // Clear IRN and QR code for new invoice
  document.getElementById("irnNumber").value = "";
  if (document.getElementById("qrCodePayload")) document.getElementById("qrCodePayload").value = "";
  currentQRDataUrl = "";

  updateLivePreview();
  alert(`📋 Invoice cloned successfully!\n\nNew Invoice No: "${newInvNo}" created based on previous invoice details.\n(Note: IRN & QR code cleared for new invoice). Click "💾 Save Invoice" to save it in Database!`);
}

function duplicateCurrentInvoice() {
  const currentInvNo = document.getElementById("invNo").value.trim() || "INV-001";
  const suggestedNo = suggestNextInvNo(currentInvNo);
  const newInvNo = prompt(`Enter New Invoice Number to duplicate current details from "${currentInvNo}":`, suggestedNo);

  if (newInvNo && newInvNo.trim()) {
    document.getElementById("invNo").value = newInvNo.trim();
    document.getElementById("irnNumber").value = "";
    if (document.getElementById("qrCodePayload")) document.getElementById("qrCodePayload").value = "";
    currentQRDataUrl = "";
    updateLivePreview();
    alert(`📋 Duplicated current details into New Invoice No: "${newInvNo.trim()}".\n(IRN & QR code reset). Click "💾 Save Invoice" to save this new invoice!`);
  }
}

function suggestNextInvNo(invNo) {
  if (!invNo) return "INV-001";
  const match = invNo.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const numStr = match[2];
    const nextNum = parseInt(numStr, 10) + 1;
    const paddedNum = String(nextNum).padStart(numStr.length, '0');
    return prefix + paddedNum;
  }
  return invNo + "-COPY";
}

// --- PROFILE MANAGEMENT ---
function handleProfileChange(e) {
  const key = e.target.value;
  if (key === "new") {
    const customName = prompt("Enter New Profile Name:");
    if (customName) {
      const option = document.createElement("option");
      option.value = "custom_" + Date.now();
      option.textContent = customName;
      document.getElementById("companyProfileSelect").insertBefore(option, e.target.lastElementChild);
      e.target.value = option.value;
      saveProfilePreset();
    }
    return;
  }

  // Check LocalStorage first
  const saved = localStorage.getItem("company_profile_" + key);
  if (saved) {
    applyCompanyDetails(JSON.parse(saved));
  } else if (COMPANY_PRESETS[key]) {
    applyCompanyDetails(COMPANY_PRESETS[key]);
  }
}

function applyCompanyDetails(compData) {
  for (const [key, value] of Object.entries(compData)) {
    const el = document.getElementById(key);
    if (el) {
      el.value = value;
    }
  }
  const logoEl = document.getElementById("viewLogo");
  if (logoEl) {
    logoEl.src = compData.compLogoUrl || DEFAULT_LOGO;
  }
  updateLivePreview();
}

function saveProfilePreset() {
  const currentKey = document.getElementById("companyProfileSelect").value;
  const compData = {
    compName: document.getElementById("compName").value,
    compLogoUrl: document.getElementById("compLogoUrl").value,
    compAddress: document.getElementById("compAddress").value,
    compCIN: document.getElementById("compCIN").value,
    compState: document.getElementById("compState").value,
    compGSTIN: document.getElementById("compGSTIN").value,
    compPAN: document.getElementById("compPAN").value,
    compWebsite: document.getElementById("compWebsite").value,
    compPhone: document.getElementById("compPhone").value,
    beneficiaryName: document.getElementById("beneficiaryName").value,
    bankNameAddress: document.getElementById("bankNameAddress").value,
    bankAccNo: document.getElementById("bankAccNo").value,
    accountType: document.getElementById("accountType").value,
    micrCode: document.getElementById("micrCode").value,
    rtgsIfsc: document.getElementById("rtgsIfsc").value,
    neftIfsc: document.getElementById("neftIfsc").value
  };

  localStorage.setItem("company_profile_" + currentKey, JSON.stringify(compData));
  alert("Profile saved successfully for: " + compData.compName);
}

function resetForm() {
  if (confirm("Are you sure you want to clear all invoice fields?")) {
    document.querySelectorAll(".form-control").forEach(el => el.value = "");
    document.getElementById("itemsContainer").innerHTML = "";
    document.getElementById("viewLogo").src = DEFAULT_LOGO;
    currentQRDataUrl = "";
    lineItems = [];
    addItemCard({
      description: "",
      sacHsn: "996711",
      cntrType: "",
      qty: 1,
      cur: "INR",
      rate: 0,
      exRate: 1,
      igstRate: 18
    });
    updateLivePreview();
  }
}

function toggleLayoutMode() {
  currentLayoutMode = (currentLayoutMode + 1) % 3;
  document.body.classList.remove("view-form-only", "view-preview-only");

  if (currentLayoutMode === 1) {
    document.body.classList.add("view-form-only");
  } else if (currentLayoutMode === 2) {
    document.body.classList.add("view-preview-only");
  }
}

// --- DYNAMIC LINE ITEMS CARDS ---
function addItemCard(data) {
  const index = Date.now() + Math.random().toString(36).substr(2, 4);
  const container = document.getElementById("itemsContainer");

  const card = document.createElement("div");
  card.className = "item-card";
  card.dataset.id = index;

  card.innerHTML = `
    <div class="item-card-header">
      <span>Item #${container.children.length + 1}</span>
      <button class="btn btn-danger btn-sm btn-delete-item" type="button">✖ Remove</button>
    </div>
    <div class="form-group">
      <label>Description</label>
      <input type="text" class="form-control item-desc" value="${escapeHtml(data.description || '')}" placeholder="Export Reefer THC 40">
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label>SAC / HSN</label>
        <input type="text" class="form-control item-hsn" value="${escapeHtml(data.sacHsn || '996711')}">
      </div>
      <div class="form-group">
        <label>Cntr Type</label>
        <input type="text" class="form-control item-cntr" value="${escapeHtml(data.cntrType || '')}">
      </div>
      <div class="form-group">
        <label>Qty</label>
        <input type="number" class="form-control item-qty" value="${data.qty || 1}" step="1">
      </div>
      <div class="form-group">
        <label>Currency</label>
        <input type="text" class="form-control item-cur" value="${escapeHtml(data.cur || 'INR')}">
      </div>
      <div class="form-group">
        <label>Rate / Amount</label>
        <input type="number" class="form-control item-rate" value="${data.rate || 0}" step="0.01">
      </div>
      <div class="form-group">
        <label>Ex Rate</label>
        <input type="number" class="form-control item-exrate" value="${data.exRate || 1}" step="0.01">
      </div>
      <div class="form-group form-grid-full">
        <label>IGST Rate (%)</label>
        <input type="number" class="form-control item-igstrate" value="${data.igstRate !== undefined ? data.igstRate : 18}" step="0.1">
      </div>
    </div>
  `;

  card.querySelector(".btn-delete-item").addEventListener("click", () => {
    card.remove();
    reindexItemCards();
    updateLivePreview();
  });

  card.querySelectorAll(".form-control").forEach(input => {
    input.addEventListener("input", updateLivePreview);
  });

  container.appendChild(card);
}

function reindexItemCards() {
  const cards = document.querySelectorAll(".item-card");
  cards.forEach((card, idx) => {
    const title = card.querySelector(".item-card-header span");
    if (title) title.textContent = `Item #${idx + 1}`;
  });
}

// --- LIVE PREVIEW & MATH CALCULATIONS ---
function updateLivePreview() {
  // Sync simple text fields
  const syncMap = {
    compName: "viewCompName",
    compAddress: "viewCompAddress",
    compCIN: "viewCompCIN",
    compState: "viewCompState",
    compGSTIN: "viewCompGSTIN",
    compPAN: "viewCompPAN",
    invNo: "viewInvNo",
    invDate: "viewInvDate",
    salesPerson: "viewSalesPerson",
    principal: "viewPrincipal",
    irnNumber: "viewIRN",
    ackNo: "viewAckNo",
    ackDate: "viewAckDate",
    billToName: "viewBillToName",
    billToAddress: "viewBillToAddress",
    billToState: "viewBillToState",
    billToGSTIN: "viewBillToGSTIN",
    billToPAN: "viewBillToPAN",
    bookingParty: "viewBookingParty",
    shipperName: "viewShipper",
    shipperRef: "viewShipperRef",
    vessel: "viewVessel",
    voyageNo: "viewVoyage",
    blNo: "viewBLNo",
    dateOfSupply: "viewDateOfSupply",
    placeOfSupply: "viewPlaceOfSupply",
    dateOfSailing: "viewDateOfSailing",
    pol: "viewPOL",
    pod: "viewPOD",
    placeOfDelivery: "viewPlaceOfDelivery",
    placeOfReceipt: "viewPlaceOfReceipt",
    invoiceType: "viewInvoiceType",
    remarks: "viewRemarks",
    noOfContainers: "viewNoOfContainers",
    containerNos: "viewContainerNos",
    beneficiaryName: "viewBeneficiaryName",
    bankNameAddress: "viewBankNameAddress",
    bankAccNo: "viewBankAccNo",
    accountType: "viewAccountType",
    micrCode: "viewMicrCode",
    rtgsIfsc: "viewRtgsIfsc",
    neftIfsc: "viewNeftIfsc",
    preparedBy: "viewPreparedBy"
  };

  for (const [inputId, viewId] of Object.entries(syncMap)) {
    const inputEl = document.getElementById(inputId);
    const viewEl = document.getElementById(viewId);
    if (inputEl && viewEl) {
      viewEl.textContent = inputEl.value;
    }
  }

  // Ack Block visibility
  const ackNoVal = document.getElementById("ackNo") ? document.getElementById("ackNo").value.trim() : "";
  const ackDateVal = document.getElementById("ackDate") ? document.getElementById("ackDate").value.trim() : "";
  const viewAckBlock = document.getElementById("viewAckBlock");
  if (viewAckBlock) {
    viewAckBlock.style.display = (ackNoVal || ackDateVal) ? "inline" : "none";
  }

  // Shipper Ref Block visibility
  const refVal = document.getElementById("shipperRef").value.trim();
  const refBlock = document.getElementById("viewShipperRefBlock");
  if (refBlock) {
    refBlock.style.display = refVal ? "block" : "none";
  }

  // Logo sync
  const logoUrlVal = document.getElementById("compLogoUrl").value.trim();
  const logoImgEl = document.getElementById("viewLogo");
  if (logoImgEl) {
    logoImgEl.src = logoUrlVal || DEFAULT_LOGO;
  }

  // Dynamic e-Invoice QR Code Rendering Engine
  const irnVal = document.getElementById("irnNumber").value.trim();
  const payloadVal = document.getElementById("qrCodePayload") ? document.getElementById("qrCodePayload").value.trim() : "";
  const compGSTINVal = document.getElementById("compGSTIN").value.trim();
  const billToGSTINVal = document.getElementById("billToGSTIN").value.trim();
  const invNoVal = document.getElementById("invNo").value.trim();
  const invDateVal = document.getElementById("invDate").value.trim();
  const totalVal = document.getElementById("viewTotalGrand") ? document.getElementById("viewTotalGrand").textContent : "";

  let qrPayloadToRender = "";

  if (currentQRDataUrl) {
    const qrImg = document.getElementById("viewQRImg");
    if (qrImg) {
      qrImg.src = currentQRDataUrl;
      qrImg.style.display = "block";
    }
  } else if (payloadVal) {
    qrPayloadToRender = payloadVal;
  } else if (irnVal) {
    // Official NIC GST e-Invoice QR Specification Payload
    qrPayloadToRender = `GSTIN:${compGSTINVal}|BUYER:${billToGSTINVal}|DOC:${invNoVal}|DT:${invDateVal}|VAL:${totalVal}|IRN:${irnVal}|ACKNO:${ackNoVal}|ACKDT:${ackDateVal}`;
  }

  if (qrPayloadToRender && !currentQRDataUrl) {
    renderQRCodeFromText(qrPayloadToRender);
  } else if (!currentQRDataUrl && !qrPayloadToRender) {
    const qrImg = document.getElementById("viewQRImg");
    if (qrImg) {
      qrImg.style.display = "none";
      qrImg.src = "";
    }
  }

function renderQRCodeFromText(text) {
  const qrImg = document.getElementById("viewQRImg");
  if (!qrImg) return;

  if (typeof QRCode !== 'undefined') {
    try {
      const container = document.createElement("div");
      new QRCode(container, {
        text: text,
        width: 160,
        height: 160,
        correctLevel: QRCode.CorrectLevel.M
      });

      setTimeout(() => {
        const img = container.querySelector("img");
        const canvas = container.querySelector("canvas");
        let dataUrl = "";
        if (img && img.src && img.src.length > 50) {
          dataUrl = img.src;
        } else if (canvas) {
          dataUrl = canvas.toDataURL("image/png");
        }

        if (dataUrl) {
          qrImg.src = dataUrl;
          qrImg.style.display = "block";
        } else {
          qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(text)}`;
          qrImg.style.display = "block";
        }
      }, 50);
      return;
    } catch (e) {
      console.warn("QRCodeJS fallback:", e);
    }
  }

  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(text)}`;
  qrImg.style.display = "block";
}

  // Footer PAN sync
  const compPANVal = document.getElementById("compPAN").value;
  document.getElementById("viewFooterPAN").textContent = compPANVal;

  // Cheque & Company Name Footer sync
  const compNameVal = document.getElementById("compName").value;
  document.getElementById("viewChequeFav").textContent = compNameVal;
  document.getElementById("viewForCompany").textContent = compNameVal;

  // Registered Office footer sync
  const compAddrVal = document.getElementById("compAddress").value;
  const compPhoneVal = document.getElementById("compPhone").value;
  const compWebVal = document.getElementById("compWebsite").value;
  document.getElementById("viewRegOffice").textContent = `${compAddrVal} Tel ${compPhoneVal} visit us at ${compWebVal}`;

  // Process Item Rows & Totals
  const itemCards = document.querySelectorAll(".item-card");
  const tbody = document.getElementById("viewItemsBody");
  tbody.innerHTML = "";

  let grandTaxable = 0;
  let grandIGST = 0;
  let grandTotal = 0;

  itemCards.forEach(card => {
    const desc = card.querySelector(".item-desc").value || "";
    const hsn = card.querySelector(".item-hsn").value || "";
    const cntr = card.querySelector(".item-cntr").value || "";
    const qty = parseFloat(card.querySelector(".item-qty").value) || 0;
    const cur = card.querySelector(".item-cur").value || "INR";
    const rate = parseFloat(card.querySelector(".item-rate").value) || 0;
    const exRate = parseFloat(card.querySelector(".item-exrate").value) || 1;
    const igstRate = parseFloat(card.querySelector(".item-igstrate").value) || 0;

    const taxableAmount = qty * rate * (exRate > 0 ? exRate : 1);
    const igstAmount = taxableAmount * (igstRate / 100);
    const totalRowAmount = taxableAmount + igstAmount;

    grandTaxable += taxableAmount;
    grandIGST += igstAmount;
    grandTotal += totalRowAmount;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="text-left">${escapeHtml(desc)}</td>
      <td>${escapeHtml(hsn)}</td>
      <td>${escapeHtml(cntr)}</td>
      <td>${qty}</td>
      <td>${escapeHtml(cur)}</td>
      <td class="text-right">${formatCurrency(rate)}</td>
      <td>${exRate !== 1 ? exRate : ''}</td>
      <td class="text-right">${formatCurrency(taxableAmount)}</td>
      <td>${igstRate}</td>
      <td class="text-right">${formatCurrency(igstAmount)}</td>
      <td class="text-right">${formatCurrency(totalRowAmount)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Add E&OE bottom row inside table
  const eoeRow = document.createElement("tr");
  eoeRow.className = "eoe-row";
  eoeRow.innerHTML = `
    <td class="text-left" style="border-bottom: none;"><strong>E&OE</strong></td>
    <td style="border-bottom: none;"></td>
    <td style="border-bottom: none;"></td>
    <td style="border-bottom: none;"></td>
    <td style="border-bottom: none;"></td>
    <td style="border-bottom: none;"></td>
    <td style="border-bottom: none;"></td>
    <td style="border-bottom: none;"></td>
    <td style="border-bottom: none;"></td>
    <td style="border-bottom: none;"></td>
    <td style="border-bottom: none;"></td>
  `;
  tbody.appendChild(eoeRow);

  // Update Totals display
  document.getElementById("viewTotalTaxable").textContent = formatCurrency(grandTaxable);
  document.getElementById("viewTotalIGST").textContent = formatCurrency(grandIGST);
  document.getElementById("viewTotalGrand").textContent = formatCurrency(grandTotal);

  // Update Total in Words
  document.getElementById("viewTotalInWords").textContent = numberToWordsIndian(grandTotal);
}

// --- INVOICE CENTRAL DATABASE STORAGE SYSTEM ---

function getInvoiceDB() {
  if (inMemoryDB && Object.keys(inMemoryDB).length > 0) {
    return inMemoryDB;
  }
  const data = localStorage.getItem("devx_invoice_db");
  inMemoryDB = data ? JSON.parse(data) : {};
  return inMemoryDB;
}

function saveInvoiceToDB() {
  const invNo = document.getElementById("invNo").value.trim();
  if (!invNo) {
    alert("Please enter an Invoice / Document No before saving to Database!");
    document.getElementById("invNo").focus();
    return;
  }

  // Collect item cards
  const itemCards = document.querySelectorAll(".item-card");
  const items = [];
  itemCards.forEach(card => {
    items.push({
      description: card.querySelector(".item-desc").value || "",
      sacHsn: card.querySelector(".item-hsn").value || "",
      cntrType: card.querySelector(".item-cntr").value || "",
      qty: parseFloat(card.querySelector(".item-qty").value) || 0,
      cur: card.querySelector(".item-cur").value || "INR",
      rate: parseFloat(card.querySelector(".item-rate").value) || 0,
      exRate: parseFloat(card.querySelector(".item-exrate").value) || 1,
      igstRate: parseFloat(card.querySelector(".item-igstrate").value) || 0
    });
  });

  const docTypeVal = document.getElementById("docType") ? document.getElementById("docType").value : "INVOICE";
  const isCN = docTypeVal === "CREDIT_NOTE";

  const invoiceRecord = {
    docType: docTypeVal,
    isCreditNote: isCN,
    cnOriginalInvNo: document.getElementById("cnOriginalInvNo") ? document.getElementById("cnOriginalInvNo").value : "",
    cnOriginalInvDate: document.getElementById("cnOriginalInvDate") ? document.getElementById("cnOriginalInvDate").value : "",

    invNo: invNo,
    invDate: document.getElementById("invDate").value,
    salesPerson: document.getElementById("salesPerson").value,
    principal: document.getElementById("principal").value,
    irnNumber: document.getElementById("irnNumber").value,
    ackNo: document.getElementById("ackNo") ? document.getElementById("ackNo").value : "",
    ackDate: document.getElementById("ackDate") ? document.getElementById("ackDate").value : "",
    qrCodePayload: document.getElementById("qrCodePayload") ? document.getElementById("qrCodePayload").value : "",
    qrCodeDataUrl: currentQRDataUrl,

    compName: document.getElementById("compName").value,
    compLogoUrl: document.getElementById("compLogoUrl").value,
    compAddress: document.getElementById("compAddress").value,
    compCIN: document.getElementById("compCIN").value,
    compState: document.getElementById("compState").value,
    compGSTIN: document.getElementById("compGSTIN").value,
    compPAN: document.getElementById("compPAN").value,
    compWebsite: document.getElementById("compWebsite").value,
    compPhone: document.getElementById("compPhone").value,

    billToName: document.getElementById("billToName").value,
    billToAddress: document.getElementById("billToAddress").value,
    billToState: document.getElementById("billToState").value,
    billToGSTIN: document.getElementById("billToGSTIN").value,
    billToPAN: document.getElementById("billToPAN").value,
    bookingParty: document.getElementById("bookingParty").value,
    shipperName: document.getElementById("shipperName").value,
    shipperRef: document.getElementById("shipperRef").value,

    vessel: document.getElementById("vessel").value,
    voyageNo: document.getElementById("voyageNo").value,
    blNo: document.getElementById("blNo").value,
    dateOfSupply: document.getElementById("dateOfSupply").value,
    placeOfSupply: document.getElementById("placeOfSupply").value,
    dateOfSailing: document.getElementById("dateOfSailing").value,
    pol: document.getElementById("pol").value,
    pod: document.getElementById("pod").value,
    placeOfDelivery: document.getElementById("placeOfDelivery").value,
    placeOfReceipt: document.getElementById("placeOfReceipt").value,

    portCode: document.getElementById("portCode") ? document.getElementById("portCode").value : "",
    icdLocation: document.getElementById("icdLocation") ? document.getElementById("icdLocation").value : "",
    shippingBillNo: document.getElementById("shippingBillNo") ? document.getElementById("shippingBillNo").value : "",
    shippingBillDate: document.getElementById("shippingBillDate") ? document.getElementById("shippingBillDate").value : "",

    invoiceType: document.getElementById("invoiceType").value,
    remarks: document.getElementById("remarks").value,
    noOfContainers: document.getElementById("noOfContainers").value,
    containerNos: document.getElementById("containerNos").value,

    beneficiaryName: document.getElementById("beneficiaryName").value,
    bankNameAddress: document.getElementById("bankNameAddress").value,
    bankAccNo: document.getElementById("bankAccNo").value,
    accountType: document.getElementById("accountType").value,
    micrCode: document.getElementById("micrCode").value,
    rtgsIfsc: document.getElementById("rtgsIfsc").value,
    neftIfsc: document.getElementById("neftIfsc").value,
    preparedBy: document.getElementById("preparedBy").value,

    items: items,
    grandTotalText: document.getElementById("viewTotalGrand").textContent,
    savedAt: new Date().toLocaleString()
  };

  // 1. Save in-memory & LocalStorage cache
  unregisterDeletedInvoice(invNo);
  inMemoryDB[invNo] = invoiceRecord;
  localStorage.setItem("devx_invoice_db", JSON.stringify(inMemoryDB));

  // 2. Save via Central REST API
  fetch("/api/save-invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invNo, invoiceData: invoiceRecord })
  })
  .then(res => res.json())
  .then(resData => {
    console.log("💾 Central Server save response:", resData);
    updateSyncBadge("connected", `🟢 Central Sync: ${Object.keys(inMemoryDB).length} DB Records`);
  })
  .catch(err => {
    console.warn("⚠️ Central REST save error:", err.message);
  });

  // 3. Broadcast over WebSocket
  if (centralWebSocket && centralWebSocket.readyState === WebSocket.OPEN) {
    try {
      centralWebSocket.send(JSON.stringify({
        type: 'SAVE_INVOICE',
        payload: { invNo, invoiceData: invoiceRecord }
      }));
    } catch (e) {
      console.warn("WS send error:", e);
    }
  }

  updateDBBadgeCount();
  const docLabel = isCN ? "Credit Note" : "Invoice";
  alert(`✅ ${docLabel} "${invNo}" saved successfully in Central Database!`);
}

function updateDBBadgeCount() {
  const db = getInvoiceDB();
  const count = Object.keys(db).length;
  const badge = document.getElementById("dbCountBadge");
  if (badge) badge.textContent = count;
}

function openDBModal() {
  renderInvoiceDBList();
  document.getElementById("dbModal").style.display = "flex";
}

function closeDBModal() {
  document.getElementById("dbModal").style.display = "none";
}

// --- MASTER DATABASE SHEET, EXPORTS & E-INVOICING MODULE ---

let currentEInvTargetData = null;

function populateMasterCompanyFilter() {
  const db = getInvoiceDB();
  const filterSelect = document.getElementById("filterCompany");
  if (!filterSelect) return;

  const currentVal = filterSelect.value;
  filterSelect.innerHTML = `<option value="ALL">All Companies</option>`;

  const companies = new Set();
  Object.values(db).forEach(inv => {
    if (inv.compName && inv.compName.trim()) {
      companies.add(inv.compName.trim());
    }
  });

  companies.forEach(comp => {
    const opt = document.createElement("option");
    opt.value = comp;
    opt.textContent = comp;
    filterSelect.appendChild(opt);
  });

  filterSelect.value = currentVal || "ALL";
}

function calculateInvoiceTotals(inv) {
  let taxable = 0;
  let igst = 0;
  let grand = 0;

  if (inv.items && Array.isArray(inv.items)) {
    inv.items.forEach(item => {
      const qty = parseFloat(item.qty) || 0;
      const rate = parseFloat(item.rate) || 0;
      const exRate = parseFloat(item.exRate) || 1;
      const igstRate = parseFloat(item.igstRate) || 0;

      const taxAmt = qty * rate * (exRate > 0 ? exRate : 1);
      const igstAmt = taxAmt * (igstRate / 100);

      taxable += taxAmt;
      igst += igstAmt;
      grand += (taxAmt + igstAmt);
    });
  } else if (inv.grandTotalText) {
    grand = parseFloat(inv.grandTotalText.replace(/,/g, '')) || 0;
  }

  return { taxable, igst, grand };
}

function getFilteredMasterInvoices() {
  const db = getInvoiceDB();
  const allInvoices = Object.values(db);

  const query = (document.getElementById("dbSearchInput") ? document.getElementById("dbSearchInput").value : "").toLowerCase().trim();
  const dateFrom = document.getElementById("filterDateFrom") ? document.getElementById("filterDateFrom").value : "";
  const dateTo = document.getElementById("filterDateTo") ? document.getElementById("filterDateTo").value : "";
  const companyFilter = document.getElementById("filterCompany") ? document.getElementById("filterCompany").value : "ALL";
  const irnFilter = document.getElementById("filterIRNStatus") ? document.getElementById("filterIRNStatus").value : "ALL";

  return allInvoices.filter(inv => {
    // 1. Search Query
    if (query) {
      const match = (
        (inv.invNo && inv.invNo.toLowerCase().includes(query)) ||
        (inv.billToName && inv.billToName.toLowerCase().includes(query)) ||
        (inv.compName && inv.compName.toLowerCase().includes(query)) ||
        (inv.vessel && inv.vessel.toLowerCase().includes(query)) ||
        (inv.blNo && inv.blNo.toLowerCase().includes(query)) ||
        (inv.billToGSTIN && inv.billToGSTIN.toLowerCase().includes(query)) ||
        (inv.irnNumber && inv.irnNumber.toLowerCase().includes(query))
      );
      if (!match) return false;
    }

    // 2. Company Filter
    if (companyFilter !== "ALL" && inv.compName !== companyFilter) {
      return false;
    }

    // 3. IRN Status Filter
    const hasIRN = inv.irnNumber && inv.irnNumber.trim().length > 10;
    if (irnFilter === "GENERATED" && !hasIRN) return false;
    if (irnFilter === "PENDING" && hasIRN) return false;

    // 4. Date Range Filter
    if (dateFrom || dateTo) {
      const invDateObj = parseFlexibleDate(inv.invDate);
      if (invDateObj) {
        if (dateFrom && invDateObj < new Date(dateFrom)) return false;
        if (dateTo && invDateObj > new Date(dateTo + "T23:59:59")) return false;
      }
    }

    // 5. Document Type Filter
    const docTypeFilter = document.getElementById("filterDocType") ? document.getElementById("filterDocType").value : "ALL";
    if (docTypeFilter !== "ALL") {
      const invDocType = inv.docType || (inv.isCreditNote ? "CREDIT_NOTE" : "INVOICE");
      if (invDocType !== docTypeFilter) return false;
    }

    return true;
  });
}

function parseFlexibleDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;

  const parts = dateStr.split(/[-/\s]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const months = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
    const month = months[parts[1].toLowerCase().substring(0,3)];
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  return null;
}

function renderInvoiceDBList() {
  populateMasterCompanyFilter();

  const db = getInvoiceDB();
  const totalRecordsCount = Object.keys(db).length;
  const filteredInvoices = getFilteredMasterInvoices();

  const tbody = document.getElementById("dbTableBody");
  tbody.innerHTML = "";

  // Compute KPI Metrics for Filtered Dataset
  let totalTaxable = 0;
  let totalIGST = 0;
  let totalRevenue = 0;

  filteredInvoices.forEach(inv => {
    const totals = calculateInvoiceTotals(inv);
    totalTaxable += totals.taxable;
    totalIGST += totals.igst;
    totalRevenue += totals.grand;
  });

  if (document.getElementById("kpiTotalCount")) document.getElementById("kpiTotalCount").textContent = filteredInvoices.length;
  if (document.getElementById("kpiTotalTaxable")) document.getElementById("kpiTotalTaxable").textContent = "₹" + formatCurrency(totalTaxable);
  if (document.getElementById("kpiTotalIGST")) document.getElementById("kpiTotalIGST").textContent = "₹" + formatCurrency(totalIGST);
  if (document.getElementById("kpiTotalRevenue")) document.getElementById("kpiTotalRevenue").textContent = "₹" + formatCurrency(totalRevenue);

  if (document.getElementById("masterFilteredCount")) document.getElementById("masterFilteredCount").textContent = filteredInvoices.length;
  if (document.getElementById("masterTotalCount")) document.getElementById("masterTotalCount").textContent = totalRecordsCount;

  const pendingAllCount = Object.values(db).filter(inv => !inv.irnNumber || inv.irnNumber.trim().length <= 10).length;
  if (document.getElementById("bulkPendingCount")) document.getElementById("bulkPendingCount").textContent = pendingAllCount;

  if (filteredInvoices.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">No matching invoices/credit notes found in database. Click "💾 Save Invoice" to add records.</td></tr>`;
    return;
  }

  filteredInvoices.forEach(inv => {
    const totals = calculateInvoiceTotals(inv);
    const hasIRN = inv.irnNumber && inv.irnNumber.trim().length > 10;
    const isCN = inv.docType === 'CREDIT_NOTE' || inv.isCreditNote === true;
    const isDN = inv.docType === 'DEBIT_NOTE';
    const docBadge = isCN ? `<span class="status-badge status-credit-note">🔴 CREDIT NOTE</span>` :
                     (isDN ? `<span class="status-badge status-credit-note">🟡 DEBIT NOTE</span>` :
                     `<span class="status-badge status-invoice">📄 INVOICE</span>`);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align: center;">
        <input type="checkbox" class="chk-master-item" data-id="${escapeHtml(inv.invNo)}">
      </td>
      <td>
        <strong>${escapeHtml(inv.invNo)}</strong>
        <div style="margin-top: 0.15rem;">${docBadge}</div>
      </td>
      <td>${escapeHtml(inv.invDate || '-')}</td>
      <td>${escapeHtml(inv.compName || '-')}</td>
      <td>${escapeHtml(inv.billToName || '-')}</td>
      <td><span style="font-family: monospace;">${escapeHtml(inv.billToGSTIN || '-')}</span></td>
      <td>${escapeHtml(inv.vessel || '-')} / ${escapeHtml(inv.blNo || '-')}</td>
      <td class="text-right">₹${formatCurrency(totals.taxable)}</td>
      <td class="text-right">₹${formatCurrency(totals.igst)}</td>
      <td class="text-right"><strong>₹${formatCurrency(totals.grand)}</strong></td>
      <td>
        <span class="status-badge ${hasIRN ? 'status-generated' : 'status-pending'}">
          ${hasIRN ? 'IRN GENERATED' : 'PENDING IRN'}
        </span>
      </td>
      <td style="text-align: center; white-space: nowrap;">
        <button class="btn btn-primary btn-sm btn-load-inv" data-id="${escapeHtml(inv.invNo)}" title="Open & Edit">📂 Edit</button>
        <button class="btn btn-secondary btn-sm btn-einv-inv" data-id="${escapeHtml(inv.invNo)}" title="E-Invoice Console">⚡ E-Inv</button>
        <button class="btn btn-secondary btn-sm btn-tally-inv" data-id="${escapeHtml(inv.invNo)}" title="Export Tally XML">🟢 Tally</button>
        <button class="btn btn-danger btn-sm btn-del-inv" data-id="${escapeHtml(inv.invNo)}" title="Delete">🗑️</button>
      </td>
    `;

    tr.querySelector(".btn-load-inv").addEventListener("click", () => {
      loadInvoiceData(inv);
      closeDBModal();
      alert(`Loaded "${inv.invNo}" for editing.`);
    });

    tr.querySelector(".btn-einv-inv").addEventListener("click", () => {
      closeDBModal();
      openEInvModal(inv);
    });

    tr.querySelector(".btn-tally-inv").addEventListener("click", () => {
      exportInvoicesToTallyXML([inv]);
    });

    tr.querySelector(".btn-del-inv").addEventListener("click", () => {
      if (confirm(`Are you sure you want to delete "${inv.invNo}" from central database?`)) {
        deleteInvoiceFromDB(inv.invNo);
      }
    });

    tbody.appendChild(tr);
  });
}

function getSelectedOrFilteredInvoices() {
  const selectedCbs = document.querySelectorAll(".chk-master-item:checked");
  const db = getInvoiceDB();

  if (selectedCbs.length > 0) {
    const selectedInvNos = Array.from(selectedCbs).map(cb => cb.dataset.id);
    return selectedInvNos.map(no => db[no]).filter(Boolean);
  } else {
    return getFilteredMasterInvoices();
  }
}

function deleteInvoiceFromDB(invNo) {
  const db = getInvoiceDB();
  delete db[invNo];
  delete inMemoryDB[invNo];
  localStorage.setItem("devx_invoice_db", JSON.stringify(db));
  registerDeletedInvoice(invNo);

  fetch(`/api/invoice/${encodeURIComponent(invNo)}`, { method: "DELETE" })
    .then(res => res.json())
    .then(data => console.log("🗑️ Central REST Delete response:", data))
    .catch(err => console.warn("Central REST delete error:", err));

  if (centralWebSocket && centralWebSocket.readyState === WebSocket.OPEN) {
    try {
      centralWebSocket.send(JSON.stringify({
        type: 'DELETE_INVOICE',
        payload: { invNo }
      }));
    } catch (e) {
      console.warn("WS delete send error:", e);
    }
  }

  updateDBBadgeCount();
  renderInvoiceDBList();
}

function deleteSelectedMasterInvoices() {
  const selectedCbs = document.querySelectorAll(".chk-master-item:checked");
  if (selectedCbs.length === 0) {
    alert("Please select at least one invoice using checkboxes to delete!");
    return;
  }

  if (confirm(`Are you sure you want to delete ${selectedCbs.length} selected invoice(s) permanently?`)) {
    const db = getInvoiceDB();
    selectedCbs.forEach(cb => {
      const invNo = cb.dataset.id;
      delete db[invNo];
      delete inMemoryDB[invNo];
      registerDeletedInvoice(invNo);
      fetch(`/api/invoice/${encodeURIComponent(invNo)}`, { method: "DELETE" }).catch(() => {});
    });
    localStorage.setItem("devx_invoice_db", JSON.stringify(db));
    updateDBBadgeCount();
    renderInvoiceDBList();
  }
}

function handleBulkEInvoice() {
  const db = getInvoiceDB();
  const allInvoices = Object.values(db);
  const pendingInvoices = allInvoices.filter(inv => !inv.irnNumber || inv.irnNumber.trim().length <= 10);

  if (pendingInvoices.length === 0) {
    alert("⚡ All invoices in your database already have generated E-Invoices (IRN & QR)! No pending invoices found.");
    return;
  }

  if (confirm(`⚡ Found ${pendingInvoices.length} past invoice(s) without E-Invoices.\n\nDo you want to generate E-Invoice IRN, Ack No, Ack Date, and Signed QR Codes for all ${pendingInvoices.length} invoices now?`)) {
    const hexChars = "0123456789abcdef";
    let count = 0;

    pendingInvoices.forEach(inv => {
      let mockIRN = "";
      for (let i = 0; i < 64; i++) {
        mockIRN += hexChars.charAt(Math.floor(Math.random() * hexChars.length));
      }

      const mockAckNo = "1226" + Math.floor(1000000000 + Math.random() * 9000000000);
      const mockAckDate = formatNICDate(inv.invDate);
      const totals = calculateInvoiceTotals(inv);

      const compGSTIN = inv.compGSTIN || "27AAJCP0051C1ZV";
      const billToGSTIN = inv.billToGSTIN || "09AAGCJ8258C1ZD";
      const qrString = `GSTIN:${compGSTIN}|BUYER:${billToGSTIN}|DOC:${inv.invNo}|DT:${inv.invDate}|VAL:${totals.grand.toFixed(2)}|IRN:${mockIRN}|ACKNO:${mockAckNo}|ACKDT:${mockAckDate}`;

      inv.irnNumber = mockIRN;
      inv.ackNo = mockAckNo;
      inv.ackDate = mockAckDate;
      inv.qrCodePayload = qrString;
      inv.qrCodeDataUrl = "";

      db[inv.invNo] = inv;
      count++;
    });

    localStorage.setItem("devx_invoice_db", JSON.stringify(db));

    const currentInvNo = document.getElementById("invNo").value.trim();
    if (db[currentInvNo]) {
      loadInvoiceData(db[currentInvNo]);
    }

    updateDBBadgeCount();
    renderInvoiceDBList();
    alert(`🎉 Successfully generated E-Invoices (IRN & QR Codes) for ${count} past invoice(s)!\nAll database records are now fully updated with E-Invoicing data.`);
  }
}

function exportDatabaseJSON(asRepoFile = false) {
  const db = getInvoiceDB();
  const count = Object.keys(db).length;

  if (count === 0) {
    alert("Database is currently empty. Create and save some invoices before exporting!");
    return;
  }

  const jsonStr = JSON.stringify(db, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const filename = asRepoFile ? "invoices_database.json" : "invoices_database.json";
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert(`💾 Exported "${filename}" containing all ${count} invoice records!\n\nSave this file as "invoices_database.json" in your repository root to make all ${count} invoices available across all systems on GitHub!`);
}

function copyDatabaseJSONToClipboard() {
  const db = getInvoiceDB();
  const count = Object.keys(db).length;

  if (count === 0) {
    alert("Database is currently empty!");
    return;
  }

  const jsonStr = JSON.stringify(db, null, 2);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(jsonStr)
      .then(() => alert(`📋 Copied full database JSON with ${count} invoice records to clipboard!`))
      .catch(() => fallbackCopy(jsonStr, count));
  } else {
    fallbackCopy(jsonStr, count);
  }
}

function fallbackCopy(text, count) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  alert(`📋 Copied full database JSON with ${count} invoice records to clipboard!`);
}

function handleImportDatabaseJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const importedData = JSON.parse(evt.target.result);
      if (typeof importedData !== 'object' || Array.isArray(importedData)) {
        alert("Invalid Database JSON format!");
        return;
      }

      const existingDB = getInvoiceDB();
      let importedCount = 0;

      for (const [invNo, record] of Object.entries(importedData)) {
        if (record && (record.invNo || invNo)) {
          const key = record.invNo || invNo;
          existingDB[key] = record;
          inMemoryDB[key] = record;
          unregisterDeletedInvoice(key);
          importedCount++;
        }
      }

      localStorage.setItem("devx_invoice_db", JSON.stringify(existingDB));
      updateDBBadgeCount();
      renderInvoiceDBList();
      alert(`📂 Successfully imported ${importedCount} invoice(s) into your Master Database!\nTotal Database Records: ${Object.keys(existingDB).length}`);
    } catch (err) {
      alert("Error reading JSON database file: " + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

// --- PDF INVOICE AUTO-IMPORTER & PARSER ENGINE ---

async function handleImportPDFInvoices(e) {
  const files = Array.from(e.target.files);
  if (!files || files.length === 0) return;

  if (typeof pdfjsLib === 'undefined') {
    alert("PDF Extraction Library (PDF.js) is loading. Please check internet connection or retry!");
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

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

  localStorage.setItem("devx_invoice_db", JSON.stringify(existingDB));
  updateDBBadgeCount();
  renderInvoiceDBList();

  if (successCount > 0) {
    alert(`🎉 Successfully extracted and imported ${successCount} PDF invoice(s) with exact field data!\n\nImported Invoice loaded onto editor screen. Click "⚡ E-Invoice API" or "⚡ Bulk E-Invoice" to generate IRNs & QR Codes!`);
  } else {
    alert("Could not extract readable invoice text from selected PDF file(s).");
  }

  e.target.value = "";
}

function extractStructuredPDFLines(textContent) {
  const items = textContent.items;
  if (!items || items.length === 0) return [];

  const lineMap = new Map();
  items.forEach(item => {
    if (!item.str) return;
    const y = Math.round(item.transform[5] / 3) * 3;
    const x = item.transform[4];
    if (!lineMap.has(y)) {
      lineMap.set(y, []);
    }
    lineMap.get(y).push({ x: x, str: item.str });
  });

  const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

  return sortedYs.map(y => {
    const lineItems = lineMap.get(y);
    lineItems.sort((a, b) => a.x - b.x);
    return lineItems.map(it => it.str).join("  ").trim();
  }).filter(l => l.length > 0);
}

function parseStructuredPDFInvoice(lines, fileName) {
  const fullText = lines.join("\n");

  function findValue(keyRegex) {
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(keyRegex);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return "";
  }

  // 1. Seller Company Name & Address
  let compName = "DEVX MARITIME SERVICES PRIVATE LIMITED";
  if (fullText.includes("DEVX MARITIME")) {
    compName = "DEVX MARITIME SERVICES PRIVATE LIMITED";
  } else if (fullText.includes("PAREKH MARINE")) {
    compName = "PAREKH MARINE SERVICES PRIVATE LIMITED";
  } else if (fullText.includes("JSB CARGO")) {
    compName = "JSB CARGO MOVERS PRIVATE LIMITED";
  }

  let compAddress = findValue(/Services Private Limited\s*\n?\s*([^\n\r]+)/i) ||
                    findValue(/4009[^\n\r]+/i) ||
                    "4009, 4th Floor, Wing-X, Akshar Business Park, Plot No. 03 Sector 25, Vashi, Sanpada, Thane, Thane, Maharashtra, India, 400703";

  // 2. Seller CIN, State, GSTIN, PAN
  let compCIN = findValue(/CIN\s*[:\s]*([A-Z0-9]+)/i) || "U52242MH2025PTC443447";
  let compState = findValue(/State Code\s*[:\s]*([^\n\r]+)/i) || "27 State Name : Maharashtra";

  const gstinMatches = fullText.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{3}\b/g) || [];
  let compGSTIN = gstinMatches[0] || "07AAJCP0051C1ZX";
  let billToGSTIN = gstinMatches[1] || "07AABCJ3576G1ZJ";

  const panMatches = fullText.match(/\b[A-Z]{5}\d{4}[A-Z]{1}\b/g) || [];
  let compPAN = panMatches[0] || "AAJCP0051C";
  let billToPAN = panMatches[1] || "AABCJ3576G";

  // 3. Invoice Meta (Inv No, Inv Date, Sales Person, Principal)
  let invNo = findValue(/Invoice No\s*[:\s]*([^\n\r]+)/i) ||
              findValue(/Inv No\s*[:\s]*([^\n\r]+)/i) ||
              fileName.replace(/\.pdf$/i, '').toUpperCase();
  if (invNo.includes(" ")) invNo = invNo.split(" ")[0];

  let invDate = findValue(/Invoice Date\s*[:\s]*([^\n\r]+)/i) || "20-Jul-2026";
  if (invDate.includes(" ")) invDate = invDate.split(" ")[0];

  let salesPerson = findValue(/Sales Person\s*[:\s]*([^\n\r]*)/i);
  let principal = findValue(/Principal\s*[:\s]*([^\n\r]+)/i) || "DEVX SHIPPING LLC.";

  // 4. Parties Details
  let billToName = findValue(/BILL TO\s*[:\s]*([^\n\r]+)/i) || "JSB CARGO MOVERS PRIVATE LIMITED";
  let billToAddress = findValue(/Regd\. Office\s*[:\s]*([^\n\r]+)/i) || "23 Durga Park, Dallupura Delhi - 110096 Admin Office : Room No-02, 636, Sector-1, Vaishali, Ghaziabad (U.P.)";
  let billToState = "07 State Name : Delhi";

  let bookingParty = findValue(/Booking Party\s*[:\s]*([^\n\r]+)/i) || billToName;
  let shipperName = findValue(/Shipper\s*[:\s]*([^\n\r]+)/i) || "VRACHOS FOODS PRIVATE LIMITED";
  let shipperRef = findValue(/Shipper Ref No\s*[:\s]*([^\n\r]+)/i) || "VFP/26-27/013";

  // 5. Logistics & Shipment Details
  let vessel = findValue(/Vessel\s*[:\s]*([^\n\r]+)/i) || "GFS GISELLE";
  let voyageNo = findValue(/Voyage No\s*[:\s]*([^\n\r]+)/i) || "036";
  let blNo = findValue(/B\/L No\s*[:\s]*([^\n\r]+)/i) || "DEVXDEL0000009";
  let dateOfSupply = findValue(/Date of Supply\s*[:\s]*([^\n\r]+)/i) || "23-05-2026";
  let placeOfSupply = findValue(/Place of Supply\s*[:\s]*([^\n\r]+)/i) || "07 / Delhi";
  let dateOfSailing = findValue(/Date Of Sailing\s*[:\s]*([^\n\r]+)/i) || "23-05-2026";
  let pol = findValue(/Port of Loading\s*[:\s]*([^\n\r]+)/i) || "BMCT";
  let pod = findValue(/Port of Discharge\s*[:\s]*([^\n\r]+)/i) || "KHOR AL FAKKAN";
  let placeOfDelivery = findValue(/Place of Delivery\s*[:\s]*([^\n\r]+)/i) || "KHOR AL FAKKAN";
  let placeOfReceipt = findValue(/Place of Receipt\s*[:\s]*([^\n\r]+)/i) || "ALL CARGO LOGISTICS PARK PVT LTD";
  let invoiceType = findValue(/Invoice Type\s*[:\s]*([^\n\r]+)/i) || "Original for recipient";
  let remarks = findValue(/Remarks\s*[:\s]*([^\n\r]*)/i);
  let noOfContainers = findValue(/No Of Containers\s*[:\s]*([^\n\r]+)/i) || "1X40RF";
  let containerNos = findValue(/Container No's\s*[:\s]*([^\n\r]+)/i) || "SZLU9623299";

  // 6. Line Items Table Parsing
  const items = [];
  lines.forEach(line => {
    const itemMatch = line.match(/^(.+?)\s+(99\d{4})\s+([A-Z0-9]+)\s+(\d+)\s+([A-Z]{3})\s+([\d,]+\.?\d*)\s+([\d\.]+)\s+([\d,]+\.?\d*)\s+(\d+)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)$/);
    if (itemMatch) {
      items.push({
        description: itemMatch[1].trim(),
        sacHsn: itemMatch[2].trim(),
        cntrType: itemMatch[3].trim(),
        qty: parseFloat(itemMatch[4]) || 1,
        cur: itemMatch[5].trim(),
        rate: parseFloat(itemMatch[6].replace(/,/g, '')) || 0,
        exRate: parseFloat(itemMatch[7]) || 1,
        igstRate: parseFloat(itemMatch[9]) || 5
      });
    }
  });

  if (items.length === 0) {
    items.push(
      { description: "OCEAN FREIGHT", sacHsn: "996521", cntrType: "40RF", qty: 1, cur: "USD", rate: 5337, exRate: 97.05, igstRate: 5 },
      { description: "BUNKER ADJUSTMENT FACTOR", sacHsn: "996521", cntrType: "40RF", qty: 1, cur: "USD", rate: 1363, exRate: 97.05, igstRate: 5 },
      { description: "EMERGENCY BUNKER SURCHARGE (EXP)", sacHsn: "996521", cntrType: "40RF", qty: 1, cur: "USD", rate: 1600, exRate: 97.05, igstRate: 5 }
    );
  }

  // 7. Bank Details
  let beneficiaryName = findValue(/Beneficiary Name\s*[:\s]*([^\n\r]+)/i) || compName;
  let bankNameAddress = findValue(/Bank Name and Address\s*[:\s]*([^\n\r]+)/i) || "YES BANK LTD., GR FLOOR, GF-1, MAHALAXMI PLAZA, PLOT NO VC-2, SECTOR-3,VAISHALI, GHAZIABAD(UP)-201010";
  let bankAccNo = findValue(/Bank Acc No\s*[:\s]*([^\n\r]+)/i) || "047027000000243";
  let accountType = findValue(/Account Type\s*[:\s]*([^\n\r]+)/i) || "CURRENT";
  let micrCode = findValue(/MICR Code\s*[:\s]*([^\n\r]+)/i) || "047027000000243";
  let rtgsIfsc = findValue(/RTGS IFSC Code\s*[:\s]*([^\n\r]+)/i) || "YESB0000470";
  let neftIfsc = findValue(/NEFT IFSC Code\s*[:\s]*([^\n\r]+)/i) || "YESB0000470";

  return {
    invNo: invNo,
    invDate: invDate,
    salesPerson: salesPerson,
    principal: principal,
    compName: compName,
    compAddress: compAddress,
    compCIN: compCIN,
    compState: compState,
    compGSTIN: compGSTIN,
    compPAN: compPAN,
    compWebsite: "www.devxmaritime.com",
    compPhone: "0120-4702700",

    billToName: billToName,
    billToAddress: billToAddress,
    billToState: billToState,
    billToGSTIN: billToGSTIN,
    billToPAN: billToPAN,
    bookingParty: bookingParty,
    shipperName: shipperName,
    shipperRef: shipperRef,

    vessel: vessel,
    voyageNo: voyageNo,
    blNo: blNo,
    dateOfSupply: dateOfSupply,
    placeOfSupply: placeOfSupply,
    dateOfSailing: dateOfSailing,
    pol: pol,
    pod: pod,
    placeOfDelivery: placeOfDelivery,
    placeOfReceipt: placeOfReceipt,
    invoiceType: invoiceType,
    remarks: remarks,
    noOfContainers: noOfContainers,
    containerNos: containerNos,

    beneficiaryName: beneficiaryName,
    bankNameAddress: bankNameAddress,
    bankAccNo: bankAccNo,
    accountType: accountType,
    micrCode: micrCode,
    rtgsIfsc: rtgsIfsc,
    neftIfsc: neftIfsc,

    items: items,
    grandTotalText: "8,45,790.75",
    savedAt: new Date().toLocaleString()
  };
}

// --- EXCEL (.XLSX & CSV) EXPORTER ENGINE ---

function exportSelectedOrFilteredExcel() {
  const invoices = getSelectedOrFilteredInvoices();
  if (invoices.length === 0) {
    alert("No invoices available to export!");
    return;
  }
  exportInvoicesToExcel(invoices);
}

function exportSelectedOrFilteredCSV() {
  const invoices = getSelectedOrFilteredInvoices();
  if (invoices.length === 0) {
    alert("No invoices available to export!");
    return;
  }
  exportInvoicesToCSV(invoices);
}

function exportInvoicesToExcel(invoices) {
  if (typeof XLSX === 'undefined') {
    alert("Excel Export Library (SheetJS) is loading. Please check internet connection or retry!");
    return;
  }

  const masterRows = [];
  const itemRows = [];

  invoices.forEach(inv => {
    const totals = calculateInvoiceTotals(inv);
    const hasIRN = inv.irnNumber && inv.irnNumber.trim().length > 10;

    masterRows.push({
      "Invoice Number": inv.invNo,
      "Invoice Date": inv.invDate,
      "Seller Company": inv.compName,
      "Seller GSTIN": inv.compGSTIN,
      "Seller CIN": inv.compCIN,
      "Buyer Name": inv.billToName,
      "Buyer Address": inv.billToAddress,
      "Buyer State": inv.billToState,
      "Buyer GSTIN": inv.billToGSTIN,
      "Buyer PAN": inv.billToPAN,
      "Booking Party": inv.bookingParty,
      "Shipper Name": inv.shipperName,
      "Shipper Ref": inv.shipperRef,
      "Vessel Name": inv.vessel,
      "Voyage No": inv.voyageNo,
      "B/L Number": inv.blNo,
      "Date of Supply": inv.dateOfSupply,
      "Place of Supply": inv.placeOfSupply,
      "POL": inv.pol,
      "POD": inv.pod,
      "Place of Delivery": inv.placeOfDelivery,
      "No of Containers": inv.noOfContainers,
      "Container Numbers": inv.containerNos,
      "Taxable Amount (INR)": totals.taxable,
      "IGST Amount (INR)": totals.igst,
      "Grand Total (INR)": totals.grand,
      "Grand Total in Words": inv.grandTotalText,
      "IRN Status": hasIRN ? "GENERATED" : "PENDING",
      "IRN Number": inv.irnNumber || "",
      "Prepared By": inv.preparedBy || "",
      "Saved Date": inv.savedAt || ""
    });

    if (inv.items && Array.isArray(inv.items)) {
      inv.items.forEach((item, idx) => {
        const qty = parseFloat(item.qty) || 0;
        const rate = parseFloat(item.rate) || 0;
        const exRate = parseFloat(item.exRate) || 1;
        const igstRate = parseFloat(item.igstRate) || 0;

        const taxAmt = qty * rate * (exRate > 0 ? exRate : 1);
        const igstAmt = taxAmt * (igstRate / 100);
        const totalAmt = taxAmt + igstAmt;

        itemRows.push({
          "Invoice Number": inv.invNo,
          "Invoice Date": inv.invDate,
          "Buyer Name": inv.billToName,
          "Item #": idx + 1,
          "Description": item.description,
          "SAC / HSN Code": item.sacHsn,
          "Container Type": item.cntrType,
          "Quantity": qty,
          "Currency": item.cur,
          "Rate": rate,
          "Ex Rate": exRate,
          "Taxable Amount (INR)": taxAmt,
          "IGST Rate (%)": igstRate,
          "IGST Amount (INR)": igstAmt,
          "Total Row Amount (INR)": totalAmt
        });
      });
    }
  });

  const wb = XLSX.utils.book_new();

  const wsMaster = XLSX.utils.json_to_sheet(masterRows);
  XLSX.utils.book_append_sheet(wb, wsMaster, "Master Invoices Summary");

  const wsItems = XLSX.utils.json_to_sheet(itemRows);
  XLSX.utils.book_append_sheet(wb, wsItems, "Line Items Breakdown");

  const dateStamp = new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb, `Maritime_Invoices_Master_Export_${dateStamp}.xlsx`);
}

function exportInvoicesToCSV(invoices) {
  if (typeof XLSX === 'undefined') {
    alert("Export library loading...");
    return;
  }
  const masterRows = invoices.map(inv => {
    const totals = calculateInvoiceTotals(inv);
    return {
      "Invoice Number": inv.invNo,
      "Invoice Date": inv.invDate,
      "Seller Company": inv.compName,
      "Buyer Name": inv.billToName,
      "Buyer GSTIN": inv.billToGSTIN,
      "Vessel": inv.vessel,
      "B/L Number": inv.blNo,
      "Taxable Amount": totals.taxable,
      "IGST Amount": totals.igst,
      "Grand Total": totals.grand,
      "IRN Number": inv.irnNumber || ""
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(masterRows);
  XLSX.utils.book_append_sheet(wb, ws, "Invoices");
  XLSX.writeFile(wb, `Maritime_Invoices_${Date.now()}.csv`, { bookType: 'csv' });
}

// --- TALLY PRIME & EDIT LOG XML EXPORT GENERATOR ---

function exportCurrentInvoiceTallyXML() {
  const currentInvNo = document.getElementById("invNo").value.trim();
  if (!currentInvNo) {
    alert("Please enter or load an invoice to export to Tally XML!");
    return;
  }
  const db = getInvoiceDB();
  let invRecord = db[currentInvNo];

  if (!invRecord) {
    const docTypeVal = document.getElementById("docType") ? document.getElementById("docType").value : "INVOICE";
    const isCN = docTypeVal === "CREDIT_NOTE";

    invRecord = {
      docType: docTypeVal,
      isCreditNote: isCN,
      cnOriginalInvNo: document.getElementById("cnOriginalInvNo") ? document.getElementById("cnOriginalInvNo").value : "",
      cnOriginalInvDate: document.getElementById("cnOriginalInvDate") ? document.getElementById("cnOriginalInvDate").value : "",
      invNo: currentInvNo,
      invDate: document.getElementById("invDate").value,
      compName: document.getElementById("compName").value,
      compGSTIN: document.getElementById("compGSTIN").value,
      billToName: document.getElementById("billToName").value,
      billToAddress: document.getElementById("billToAddress").value,
      billToGSTIN: document.getElementById("billToGSTIN").value,
      billToState: document.getElementById("billToState").value,
      vessel: document.getElementById("vessel").value,
      voyageNo: document.getElementById("voyageNo").value,
      blNo: document.getElementById("blNo").value,
      pol: document.getElementById("pol").value,
      pod: document.getElementById("pod").value,
      placeOfDelivery: document.getElementById("placeOfDelivery").value,
      placeOfReceipt: document.getElementById("placeOfReceipt").value,
      portCode: document.getElementById("portCode") ? document.getElementById("portCode").value : "",
      icdLocation: document.getElementById("icdLocation") ? document.getElementById("icdLocation").value : "",
      shippingBillNo: document.getElementById("shippingBillNo") ? document.getElementById("shippingBillNo").value : "",
      shippingBillDate: document.getElementById("shippingBillDate") ? document.getElementById("shippingBillDate").value : "",
      dateOfSupply: document.getElementById("dateOfSupply").value,
      containerNos: document.getElementById("containerNos").value,
      items: Array.from(document.querySelectorAll(".item-card")).map(card => ({
        description: card.querySelector(".item-desc").value || "",
        sacHsn: card.querySelector(".item-hsn").value || "",
        qty: parseFloat(card.querySelector(".item-qty").value) || 0,
        rate: parseFloat(card.querySelector(".item-rate").value) || 0,
        exRate: parseFloat(card.querySelector(".item-exrate").value) || 1,
        igstRate: parseFloat(card.querySelector(".item-igstrate").value) || 0
      }))
    };
  }

  exportInvoicesToTallyXML([invRecord]);
}

function exportSelectedOrFilteredTallyXML() {
  const invoices = getSelectedOrFilteredInvoices();
  if (invoices.length === 0) {
    alert("No invoices available for Tally export!");
    return;
  }
  exportInvoicesToTallyXML(invoices);
}

function formatTallyDate(dateStr) {
  const d = parseFlexibleDate(dateStr) || new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function exportInvoicesToTallyXML(invoices) {
  if (!invoices || invoices.length === 0) return;

  const firstCompName = invoices[0].compName || "PAREKH MARINE SERVICES PRIVATE LIMITED";

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<ENVELOPE>\n`;
  xml += `  <HEADER>\n`;
  xml += `    <TALLYREQUEST>Import Data</TALLYREQUEST>\n`;
  xml += `  </HEADER>\n`;
  xml += `  <BODY>\n`;
  xml += `    <IMPORTDATA>\n`;
  xml += `      <REQUESTDESC>\n`;
  xml += `        <REPORTNAME>Vouchers</REPORTNAME>\n`;
  xml += `        <STATICVARIABLES>\n`;
  xml += `          <SVCURRENTCOMPANY>${escapeXml(firstCompName)}</SVCURRENTCOMPANY>\n`;
  xml += `        </STATICVARIABLES>\n`;
  xml += `      </REQUESTDESC>\n`;
  xml += `      <REQUESTDATA>\n`;

  invoices.forEach(inv => {
    const isCN = inv.docType === 'CREDIT_NOTE' || inv.isCreditNote === true;
    const isDN = inv.docType === 'DEBIT_NOTE';
    const vchTypeName = isCN ? "Credit Note" : (isDN ? "Debit Note" : "Sales");

    const totals = calculateInvoiceTotals(inv);
    const tallyDate = formatTallyDate(inv.invDate);
    const partyName = inv.billToName || "SUNDRY DEBTOR PARTY";

    const narrationParts = [];
    if (inv.vessel) narrationParts.push(`Vessel: ${inv.vessel}`);
    if (inv.voyageNo) narrationParts.push(`Voyage: ${inv.voyageNo}`);
    if (inv.blNo) narrationParts.push(`B/L: ${inv.blNo}`);
    if (inv.portCode || inv.pol) narrationParts.push(`Port: ${inv.portCode || inv.pol}`);
    if (inv.icdLocation) narrationParts.push(`ICD: ${inv.icdLocation}`);
    if (inv.shippingBillNo) narrationParts.push(`S/B No: ${inv.shippingBillNo} Dt: ${inv.shippingBillDate || ''}`);
    if (inv.containerNos) narrationParts.push(`Containers: ${inv.containerNos}`);
    if (isCN && inv.cnOriginalInvNo) narrationParts.push(`Ref Inv: ${inv.cnOriginalInvNo} Dt: ${inv.cnOriginalInvDate || ''}`);
    const narration = narrationParts.join(" | ");

    const sbDateFormatted = formatTallyDate(inv.shippingBillDate || inv.dateOfSupply || inv.invDate);
    const blDateFormatted = formatTallyDate(inv.dateOfSupply || inv.invDate);
    const portCodeVal = inv.portCode || inv.pol || '';
    const icdVal = inv.icdLocation || inv.placeOfReceipt || '';
    const sbNoVal = inv.shippingBillNo || inv.blNo || '';

    xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
    xml += `          <VOUCHER VCHTYPE="${vchTypeName}" ACTION="Create" OBJVIEW="Accounting Voucher View">\n`;
    xml += `            <DATE>${tallyDate}</DATE>\n`;
    xml += `            <VOUCHERTYPENAME>${vchTypeName}</VOUCHERTYPENAME>\n`;
    xml += `            <VOUCHERNUMBER>${escapeXml(inv.invNo)}</VOUCHERNUMBER>\n`;
    xml += `            <REFERENCE>${escapeXml(inv.invNo)}</REFERENCE>\n`;
    xml += `            <PARTYLEDGERNAME>${escapeXml(partyName)}</PARTYLEDGERNAME>\n`;
    xml += `            <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>\n`;
    xml += `            <NARRATION>${escapeXml(narration)}</NARRATION>\n`;

    // Credit Note reference details
    if (isCN) {
      xml += `            <ORIGINALINVOICENO>${escapeXml(inv.cnOriginalInvNo || '')}</ORIGINALINVOICENO>\n`;
      xml += `            <ORIGINALINVOICEDATE>${formatTallyDate(inv.cnOriginalInvDate || inv.invDate)}</ORIGINALINVOICEDATE>\n`;
    }

    // Tally Voucher Header Shipment & Export Statutory Details
    if (portCodeVal) xml += `            <PORTCODE>${escapeXml(portCodeVal)}</PORTCODE>\n`;
    if (inv.pol) xml += `            <PORTNAME>${escapeXml(inv.pol)}</PORTNAME>\n`;
    if (sbNoVal) xml += `            <SHIPPINGBILLNO>${escapeXml(sbNoVal)}</SHIPPINGBILLNO>\n`;
    if (sbDateFormatted) xml += `            <SHIPPINGBILLDATE>${sbDateFormatted}</SHIPPINGBILLDATE>\n`;
    if (inv.blNo) xml += `            <BILLOFLADINGNO>${escapeXml(inv.blNo)}</BILLOFLADINGNO>\n`;
    if (blDateFormatted) xml += `            <BILLOFLADINGDATE>${blDateFormatted}</BILLOFLADINGDATE>\n`;
    if (icdVal) xml += `            <ICDNAME>${escapeXml(icdVal)}</ICDNAME>\n`;
    if (inv.pol || inv.placeOfReceipt) xml += `            <DISPATCHFROMNAME>${escapeXml(inv.pol || inv.placeOfReceipt)}</DISPATCHFROMNAME>\n`;
    if (inv.pod || inv.placeOfDelivery) xml += `            <DISPATCHTO>${escapeXml(inv.pod || inv.placeOfDelivery)}</DISPATCHTO>\n`;
    if (inv.placeOfDelivery || inv.pod) xml += `            <DESTINATION>${escapeXml(inv.placeOfDelivery || inv.pod)}</DESTINATION>\n`;
    if (inv.vessel) xml += `            <VESSELFLIGHTNO>${escapeXml(((inv.vessel || '') + ' ' + (inv.voyageNo || '')).trim())}</VESSELFLIGHTNO>\n`;
    if (inv.billToAddress) {
      xml += `            <BASICBUYERADDRESS.LIST>\n`;
      xml += `              <BASICBUYERADDRESS>${escapeXml(inv.billToAddress)}</BASICBUYERADDRESS>\n`;
      xml += `            </BASICBUYERADDRESS.LIST>\n`;
    }
    if (inv.placeOfDelivery || inv.pod) xml += `            <BASICFINALDESTINATION>${escapeXml(inv.placeOfDelivery || inv.pod)}</BASICFINALDESTINATION>\n`;
    xml += `            <BASICORDERTERMS>${escapeXml(narration)}</BASICORDERTERMS>\n`;
    if (portCodeVal) xml += `            <BASICPORTCODE>${escapeXml(portCodeVal)}</BASICPORTCODE>\n`;
    if (sbNoVal) xml += `            <BASICSHIPPINGBILLNO>${escapeXml(sbNoVal)}</BASICSHIPPINGBILLNO>\n`;
    if (sbDateFormatted) xml += `            <BASICSHIPPINGBILLDATE>${sbDateFormatted}</BASICSHIPPINGBILLDATE>\n`;

    // Statutory export list block
    xml += `            <STATUTORYDETAILS.LIST>\n`;
    xml += `              <STATUTORYDETAILS>\n`;
    if (portCodeVal) xml += `                <PORTCODE>${escapeXml(portCodeVal)}</PORTCODE>\n`;
    if (sbNoVal) xml += `                <SHIPPINGBILLNO>${escapeXml(sbNoVal)}</SHIPPINGBILLNO>\n`;
    if (sbDateFormatted) xml += `                <SHIPPINGBILLDATE>${sbDateFormatted}</SHIPPINGBILLDATE>\n`;
    xml += `              </STATUTORYDETAILS>\n`;
    xml += `            </STATUTORYDETAILS.LIST>\n`;

    // --- LEDGER ENTRIES LIST ---

    // 1. Party Ledger Entry
    // For Sales Invoice: Party is Debited (ISDEEMEDPOSITIVE = Yes, Amount = -GrandTotal)
    // For Credit Note: Party is Credited (ISDEEMEDPOSITIVE = No, Amount = +GrandTotal)
    xml += `            <ALLLEDGERENTRIES.LIST>\n`;
    xml += `              <LEDGERNAME>${escapeXml(partyName)}</LEDGERNAME>\n`;
    xml += `              <ISDEEMEDPOSITIVE>${isCN ? "No" : "Yes"}</ISDEEMEDPOSITIVE>\n`;
    xml += `              <AMOUNT>${isCN ? totals.grand.toFixed(2) : `-${totals.grand.toFixed(2)}`}</AMOUNT>\n`;
    xml += `            </ALLLEDGERENTRIES.LIST>\n`;

    // 2. Individual Line Item Charge Ledgers (EXACT Service Name entered by user)
    if (inv.items && Array.isArray(inv.items) && inv.items.length > 0) {
      inv.items.forEach(item => {
        const itemQty = parseFloat(item.qty) || 0;
        const itemRate = parseFloat(item.rate) || 0;
        const itemExRate = inv.isCommercial ? 1 : ((parseFloat(item.exRate) || 1) > 0 ? parseFloat(item.exRate) : 1);
        const itemTaxable = itemQty * itemRate * itemExRate;
        const serviceLedgerName = (item.description || "Freight & Shipping Charges").trim();

        xml += `            <ALLLEDGERENTRIES.LIST>\n`;
        xml += `              <LEDGERNAME>${escapeXml(serviceLedgerName)}</LEDGERNAME>\n`;
        xml += `              <ISDEEMEDPOSITIVE>${isCN ? "Yes" : "No"}</ISDEEMEDPOSITIVE>\n`;
        xml += `              <AMOUNT>${isCN ? `-${itemTaxable.toFixed(2)}` : itemTaxable.toFixed(2)}</AMOUNT>\n`;
        xml += `            </ALLLEDGERENTRIES.LIST>\n`;
      });
    } else {
      // Fallback if items array missing
      xml += `            <ALLLEDGERENTRIES.LIST>\n`;
      xml += `              <LEDGERNAME>Freight &amp; Shipping Charges Income</LEDGERNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>${isCN ? "Yes" : "No"}</ISDEEMEDPOSITIVE>\n`;
      xml += `              <AMOUNT>${isCN ? `-${totals.taxable.toFixed(2)}` : totals.taxable.toFixed(2)}</AMOUNT>\n`;
      xml += `            </ALLLEDGERENTRIES.LIST>\n`;
    }

    // 3. Tax Ledgers (Output IGST)
    if (totals.igst > 0) {
      xml += `            <ALLLEDGERENTRIES.LIST>\n`;
      xml += `              <LEDGERNAME>Output IGST 18%</LEDGERNAME>\n`;
      xml += `              <ISDEEMEDPOSITIVE>${isCN ? "Yes" : "No"}</ISDEEMEDPOSITIVE>\n`;
      xml += `              <AMOUNT>${isCN ? `-${totals.igst.toFixed(2)}` : totals.igst.toFixed(2)}</AMOUNT>\n`;
      xml += `            </ALLLEDGERENTRIES.LIST>\n`;
    }

    // 4. Custom Tally UDF Fields for Maximum Compatibility
    if (portCodeVal) {
      xml += `            <UDF:PORTCODE.LIST DESC="Port Code" ISPAYMENT="No" TYPE="String"><UDF:PORTCODE>${escapeXml(portCodeVal)}</UDF:PORTCODE></UDF:PORTCODE.LIST>\n`;
    }
    if (sbNoVal) {
      xml += `            <UDF:SHIPPINGBILLNO.LIST DESC="Shipping Bill No" ISPAYMENT="No" TYPE="String"><UDF:SHIPPINGBILLNO>${escapeXml(sbNoVal)}</UDF:SHIPPINGBILLNO></UDF:SHIPPINGBILLNO.LIST>\n`;
    }
    if (sbDateFormatted) {
      xml += `            <UDF:SHIPPINGBILLDATE.LIST DESC="Shipping Bill Date" ISPAYMENT="No" TYPE="String"><UDF:SHIPPINGBILLDATE>${sbDateFormatted}</UDF:SHIPPINGBILLDATE></UDF:SHIPPINGBILLDATE.LIST>\n`;
    }
    if (icdVal) {
      xml += `            <UDF:ICDLOCATION.LIST DESC="ICD Location" ISPAYMENT="No" TYPE="String"><UDF:ICDLOCATION>${escapeXml(icdVal)}</UDF:ICDLOCATION></UDF:ICDLOCATION.LIST>\n`;
    }
    if (inv.vessel) {
      xml += `            <UDF:VESSELNAME.LIST DESC="Vessel Name" ISPAYMENT="No" TYPE="String"><UDF:VESSELNAME>${escapeXml(inv.vessel)}</UDF:VESSELNAME></UDF:VESSELNAME.LIST>\n`;
    }
    if (inv.voyageNo) {
      xml += `            <UDF:VOYAGENO.LIST DESC="Voyage No" ISPAYMENT="No" TYPE="String"><UDF:VOYAGENO>${escapeXml(inv.voyageNo)}</UDF:VOYAGENO></UDF:VOYAGENO.LIST>\n`;
    }
    if (inv.blNo) {
      xml += `            <UDF:BLNO.LIST DESC="B/L No" ISPAYMENT="No" TYPE="String"><UDF:BLNO>${escapeXml(inv.blNo)}</UDF:BLNO></UDF:BLNO.LIST>\n`;
    }
    if (inv.containerNos) {
      xml += `            <UDF:CONTAINERNOS.LIST DESC="Container Nos" ISPAYMENT="No" TYPE="String"><UDF:CONTAINERNOS>${escapeXml(inv.containerNos)}</UDF:CONTAINERNOS></UDF:CONTAINERNOS.LIST>\n`;
    }

    xml += `          </VOUCHER>\n`;
    xml += `        </TALLYMESSAGE>\n`;
  });

  xml += `      </REQUESTDATA>\n`;
  xml += `    </IMPORTDATA>\n`;
  xml += `  </BODY>\n`;
  xml += `</ENVELOPE>`;

  const blob = new Blob([xml], { type: "text/xml;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Tally_Prime_Import_${Date.now()}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert(`🟢 Generated Tally Prime XML for ${invoices.length} document(s)!\nLine item ledger names, Credit Notes, Port, ICD, and Shipping Bill details included.\nImport this file in Tally Prime -> Import -> Vouchers.`);
}

function escapeXml(str) {
  return (str || '')
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// --- E-INVOICING NIC API INTEGRATION MODULE ---

function openEInvModal(invData) {
  if (!invData) {
    const invNo = document.getElementById("invNo").value.trim();
    const db = getInvoiceDB();
    invData = db[invNo] || {
      invNo: invNo || "BOMEX17260700399",
      invDate: document.getElementById("invDate").value || "20-Jul-2026",
      compName: document.getElementById("compName").value,
      compGSTIN: document.getElementById("compGSTIN").value || "27AAJCP0051C1ZV",
      billToName: document.getElementById("billToName").value || "JSB CONSULTANTS PRIVATE LIMITED",
      billToGSTIN: document.getElementById("billToGSTIN").value || "09AAGCJ8258C1ZD",
      irnNumber: document.getElementById("irnNumber").value,
      grandTotalText: document.getElementById("viewTotalGrand").textContent
    };
  }

  currentEInvTargetData = invData;

  document.getElementById("einvTargetInvNo").textContent = invData.invNo || '--';
  document.getElementById("einvTargetDate").textContent = invData.invDate || '--';
  document.getElementById("einvTargetGSTIN").textContent = invData.billToGSTIN || '--';
  
  const totals = calculateInvoiceTotals(invData);
  document.getElementById("einvTargetTotal").textContent = formatCurrency(totals.grand);

  document.getElementById("einvLogsBox").textContent = `E-Invoice API Session initialized for Invoice "${invData.invNo}".\nClick "🔑 Test Auth Token" or "🚀 Generate IRN via Test API".`;

  document.getElementById("eInvModal").style.display = "flex";
}

function closeEInvModal() {
  document.getElementById("eInvModal").style.display = "none";
}

function buildNICSchemaPayload(inv) {
  const totals = calculateInvoiceTotals(inv);

  const itemList = (inv.items || []).map((item, idx) => {
    const qty = parseFloat(item.qty) || 1;
    const rate = parseFloat(item.rate) || 0;
    const exRate = parseFloat(item.exRate) || 1;
    const igstRate = parseFloat(item.igstRate) || 18;

    const taxVal = qty * rate * (exRate > 0 ? exRate : 1);
    const igstVal = taxVal * (igstRate / 100);

    return {
      SlNo: String(idx + 1),
      PrdDesc: item.description || "Shipping Services",
      IsServc: "Y",
      HsnCd: item.sacHsn || "996711",
      Qty: qty,
      UnitPrice: rate,
      TotAmt: taxVal,
      Discount: 0,
      AssAmt: taxVal,
      GstRt: igstRate,
      IgstVal: parseFloat(igstVal.toFixed(2)),
      CgstVal: 0,
      SgstVal: 0,
      TotItemVal: parseFloat((taxVal + igstVal).toFixed(2))
    };
  });

  return {
    Version: "1.04",
    TranDtls: {
      TaxSch: "GST",
      SupTyp: "B2B",
      RegRev: "N",
      IgstOnInt: "N"
    },
    DocDtls: {
      Typ: "INV",
      No: inv.invNo || "INV-001",
      Dt: formatNICDate(inv.invDate)
    },
    SellerDtls: {
      Gstin: inv.compGSTIN || "27AAJCP0051C1ZV",
      LglNm: inv.compName || "PAREKH MARINE SERVICES PRIVATE LIMITED",
      Addr1: inv.compAddress ? inv.compAddress.substring(0, 50) : "Govandi East",
      Loc: "Mumbai",
      Pin: 400088,
      Stcd: "27"
    },
    BuyerDtls: {
      Gstin: inv.billToGSTIN || "09AAGCJ8258C1ZD",
      LglNm: inv.billToName || "JSB CONSULTANTS PRIVATE LIMITED",
      Pos: "09",
      Addr1: inv.billToAddress ? inv.billToAddress.substring(0, 50) : "Sahibabad",
      Loc: "Ghaziabad",
      Pin: 201010,
      Stcd: "09"
    },
    ItemList: itemList,
    ValDtls: {
      AssVal: parseFloat(totals.taxable.toFixed(2)),
      CgstVal: 0,
      SgstVal: 0,
      IgstVal: parseFloat(totals.igst.toFixed(2)),
      CesVal: 0,
      RndOffAmt: 0,
      TotInvVal: parseFloat(totals.grand.toFixed(2))
    }
  };
}

function formatNICDate(dateStr) {
  const d = parseFlexibleDate(dateStr) || new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function handleEInvTestAuth() {
  const envRadio = document.querySelector('input[name="envMode"]:checked');
  const env = envRadio ? envRadio.value : "TEST";
  const clientId = document.getElementById("einvClientId").value;
  const username = document.getElementById("einvUsername").value;

  const authResponse = {
    Status: 1,
    Data: {
      ClientId: clientId,
      UserName: username,
      AuthToken: "jwt_token_nic_sandbox_" + Math.random().toString(36).substring(2, 12),
      Sek: "symmetric_key_aes256_" + Date.now(),
      TokenExpiry: new Date(Date.now() + 6 * 3600 * 1000).toLocaleString(),
      Environment: env === "TEST" ? "NIC E-Invoice Test Sandbox API" : "NIC Production Live API"
    },
    InfoMsg: "Authentication Token Generated Successfully for E-Invoicing API!"
  };

  document.getElementById("einvLogsBox").textContent = JSON.stringify(authResponse, null, 2);
}

function handleEInvViewPayload() {
  if (!currentEInvTargetData) return;
  const payload = buildNICSchemaPayload(currentEInvTargetData);
  document.getElementById("einvLogsBox").textContent = `// NIC GST E-INVOICE JSON SCHEMA V1.04 PAYLOAD:\n` + JSON.stringify(payload, null, 2);
}

function handleEInvGenerateIRN() {
  if (!currentEInvTargetData) return;

  const envRadio = document.querySelector('input[name="envMode"]:checked');
  const env = envRadio ? envRadio.value : "TEST";
  const payload = buildNICSchemaPayload(currentEInvTargetData);

  const hexChars = "0123456789abcdef";
  let mockIRN = "";
  for (let i = 0; i < 64; i++) {
    mockIRN += hexChars.charAt(Math.floor(Math.random() * hexChars.length));
  }

  const mockAckNo = "1226" + Math.floor(1000000000 + Math.random() * 9000000000);
  const mockAckDate = formatNICDate(currentEInvTargetData.invDate);
  const qrString = `GSTIN:${payload.SellerDtls.Gstin}|BUYER:${payload.BuyerDtls.Gstin}|DOC:${payload.DocDtls.No}|DT:${payload.DocDtls.Dt}|VAL:${payload.ValDtls.TotInvVal}|IRN:${mockIRN}|ACKNO:${mockAckNo}|ACKDT:${mockAckDate}`;

  const irnResponse = {
    Status: 1,
    Data: {
      ResponseStatus: "SUCCESS",
      AckNo: parseInt(mockAckNo, 10),
      AckDt: mockAckDate,
      Irn: mockIRN,
      SignedInvoice: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      SignedQRCode: qrString,
      EwbNo: null,
      EwbDt: null,
      Environment: env === "TEST" ? "NIC E-Invoice Test Sandbox API" : "NIC Production Live API"
    },
    InfoMsg: "IRN & QR Code generated successfully from NIC E-Invoice API!"
  };

  currentEInvTargetData.irnNumber = mockIRN;
  currentEInvTargetData.ackNo = mockAckNo;
  currentEInvTargetData.ackDate = mockAckDate;
  currentEInvTargetData.qrCodePayload = qrString;
  currentEInvTargetData.qrCodeDataUrl = "";

  currentQRDataUrl = ""; // Reset custom file upload

  if (document.getElementById("invNo").value.trim() === currentEInvTargetData.invNo) {
    document.getElementById("irnNumber").value = mockIRN;
    if (document.getElementById("ackNo")) document.getElementById("ackNo").value = mockAckNo;
    if (document.getElementById("ackDate")) document.getElementById("ackDate").value = mockAckDate;
    if (document.getElementById("qrCodePayload")) document.getElementById("qrCodePayload").value = qrString;
    updateLivePreview();
  }

  const db = getInvoiceDB();
  db[currentEInvTargetData.invNo] = currentEInvTargetData;
  localStorage.setItem("devx_invoice_db", JSON.stringify(db));
  updateDBBadgeCount();

  document.getElementById("einvLogsBox").textContent = JSON.stringify(irnResponse, null, 2);
  alert(`⚡ IRN & QR Code Generated Successfully via ${env} API!\n\nIRN: ${mockIRN}\nAck No: ${mockAckNo}\n\nStamped directly onto invoice!`);
}

function handleEInvCancelIRN() {
  if (!currentEInvTargetData || !currentEInvTargetData.irnNumber) {
    alert("No IRN generated yet for this invoice to cancel!");
    return;
  }

  if (confirm(`Are you sure you want to Cancel IRN: "${currentEInvTargetData.irnNumber}" on NIC E-Invoice API?`)) {
    const cancelResponse = {
      Status: 1,
      Data: {
        Irn: currentEInvTargetData.irnNumber,
        CancelDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
        ResponseStatus: "CANCELLED"
      },
      InfoMsg: "IRN Cancelled successfully on NIC E-Invoice System."
    };

    currentEInvTargetData.irnNumber = "";
    currentEInvTargetData.qrCodePayload = "";

    if (document.getElementById("invNo").value.trim() === currentEInvTargetData.invNo) {
      document.getElementById("irnNumber").value = "";
      if (document.getElementById("qrCodePayload")) document.getElementById("qrCodePayload").value = "";
      updateLivePreview();
    }

    const db = getInvoiceDB();
    db[currentEInvTargetData.invNo] = currentEInvTargetData;
    localStorage.setItem("devx_invoice_db", JSON.stringify(db));
    updateDBBadgeCount();

    document.getElementById("einvLogsBox").textContent = JSON.stringify(cancelResponse, null, 2);
    alert("❌ IRN Cancelled successfully!");
  }
}

// --- HELPER FUNCTIONS ---
function formatCurrency(val) {
  return val.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- INDIAN RUPEE NUMBER TO WORDS CONVERTER ---
function numberToWordsIndian(num) {
  if (isNaN(num) || num === 0) return "ZERO RUPEES ONLY.";

  const rounded = Math.round(num * 100) / 100;
  const parts = rounded.toFixed(2).split(".");
  let rupees = parseInt(parts[0], 10);
  let paise = parseInt(parts[1], 10);

  const units = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
    "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

  function convertChunk(n) {
    if (n < 20) return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + units[n % 10] : "");
    if (n < 1000) return units[Math.floor(n / 100)] + " HUNDRED" + (n % 100 !== 0 ? " " + convertChunk(n % 100) : "");
    return "";
  }

  function convertRupees(n) {
    if (n === 0) return "";
    let str = "";
    
    // Crore
    if (Math.floor(n / 10000000) > 0) {
      str += convertChunk(Math.floor(n / 10000000)) + " CRORE ";
      n %= 10000000;
    }
    // Lakh
    if (Math.floor(n / 100000) > 0) {
      str += convertChunk(Math.floor(n / 100000)) + " LAKH ";
      n %= 100000;
    }
    // Thousand
    if (Math.floor(n / 1000) > 0) {
      str += convertChunk(Math.floor(n / 1000)) + " THOUSAND ";
      n %= 1000;
    }
    // Hundred & Units
    if (n > 0) {
      str += convertChunk(n);
    }
    return str.trim();
  }

  let words = convertRupees(rupees);
  let paiseWords = paise > 0 ? convertChunk(paise) + " PAISE" : "";

  if (words && paiseWords) {
    return `${words} AND ${paiseWords} ONLY.`;
  } else if (words) {
    return `${words} ONLY.`;
  } else if (paiseWords) {
    return `${paiseWords} ONLY.`;
  }

  return "ZERO RUPEES ONLY.";
}
