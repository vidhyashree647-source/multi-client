/**
 * ============================================================================
 * NETSOCKET PRO - MULTI-CLIENT CHAT SERVER SIMULATOR
 * Computer Networks Mini-Project Core Application Logic
 * ============================================================================
 * 
 * Concept Overview:
 * This script simulates an event-driven TCP/WebSocket Central Chat Server.
 * It demonstrates real-time client-server communication, iterative socket broadcasting,
 * unicasting (private messages), client state management, and network analytics.
 * 
 * Socket Event Flow:
 * 1. Client connects -> Server triggers 'connection' event & updates client registry.
 * 2. Client sends payload -> Server parses destination ('ALL' vs specific Client ID).
 * 3. Server broadcasts -> Iterates active client sockets and forwards packet.
 * 4. Client disconnects -> Server removes socket reference & alerts remaining peers.
 */

// --- GLOBAL APPLICATION STATE ---
const AppState = {
    // Current User Session
    currentUser: {
        name: "Shyam",
        ip: "192.168.1.101",
        port: 54321
    },

    // Server Configuration
    server: {
        host: "127.0.0.1",
        port: 8080,
        protocol: "TCP/WebSocket (Simulated)",
        status: "CONNECTED", // CONNECTED, DISCONNECTED, CONNECTING
        startTime: new Date()
    },

    // Statistics
    stats: {
        messagesSent: 0,
        messagesReceived: 0,
        connectionsCount: 4,
        disconnectionsCount: 0
    },

    // Connected Simulated Clients Directory
    clients: [
        { id: "c_1", name: "Shyam", ip: "192.168.1.101", port: 54321, online: true, joinedAt: "10:30:00", sentCount: 0, isMe: true },
        { id: "c_2", name: "Rahul", ip: "192.168.1.102", port: 54322, online: true, joinedAt: "10:31:05", sentCount: 0, isMe: false },
        { id: "c_3", name: "Priya", ip: "192.168.1.103", port: 54323, online: true, joinedAt: "10:31:40", sentCount: 0, isMe: false },
        { id: "c_4", name: "Arjun", ip: "192.168.1.104", port: 54324, online: true, joinedAt: "10:32:10", sentCount: 0, isMe: false }
    ],

    // Messages Log
    messages: [],

    // Activity Logs
    logs: [],

    // Simulation Settings
    settings: {
        latency: 0,
        autoReply: true
    }
};

// --- INITIALIZATION & DOM LOADED ---
document.addEventListener("DOMContentLoaded", () => {
    // Load persisted state if present in LocalStorage
    loadPersistedData();

    // Start Uptime Timer Clock
    startUptimeClock();

    // Render Initial UI components
    renderAllViews();

    // Log server startup
    if (AppState.logs.length === 0) {
        logActivity("SERVER", `Server listening on ${AppState.server.host}:${AppState.server.port} [${AppState.server.protocol}]`);
        logActivity("CONNECTION", `Client Shyam connected from ${AppState.currentUser.ip}:${AppState.currentUser.port}`);
        logActivity("CONNECTION", `Client Rahul connected from 192.168.1.102:54322`);
        logActivity("CONNECTION", `Client Priya connected from 192.168.1.103:54323`);
        logActivity("CONNECTION", `Client Arjun connected from 192.168.1.104:54324`);
    }

    // Initialize Default Demo Messages if fresh
    if (AppState.messages.length === 0) {
        injectDemoScenarioMessages();
    }

    // Add Mobile Navigation Handler
    const mobileBtn = document.getElementById("mobile-menu-toggle");
    if (mobileBtn) {
        mobileBtn.addEventListener("click", () => {
            const sidebar = document.getElementById("app-sidebar");
            sidebar.classList.toggle("open");
        });
    }
});

// --- NAVIGATION & VIEW SWITCHING ---
function switchView(viewId, element) {
    // Update Active Nav Item
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    if (element) {
        element.classList.add("active");
    } else {
        const targetBtn = document.querySelector(`.nav-item[data-view="${viewId}"]`);
        if (targetBtn) targetBtn.classList.add("active");
    }

    // Hide all view panels and display target view
    document.querySelectorAll(".view-panel").forEach(panel => panel.classList.remove("active"));
    const targetPanel = document.getElementById(viewId);
    if (targetPanel) {
        targetPanel.classList.add("active");
    }

    // Close mobile menu if open
    const sidebar = document.getElementById("app-sidebar");
    if (sidebar) sidebar.classList.remove("open");
}

// --- LOGIN & CONNECTION CONTROL ---
function openLoginModal() {
    const modal = document.getElementById("login-modal");
    modal.classList.remove("hidden");
}

function closeLoginModal() {
    const modal = document.getElementById("login-modal");
    modal.classList.add("hidden");
}

function handleLogin() {
    const usernameInput = document.getElementById("input-username").value.trim();
    const hostInput = document.getElementById("input-server-ip").value.trim();
    const portInput = parseInt(document.getElementById("input-server-port").value, 10);
    const protocolInput = document.getElementById("input-protocol").value;

    if (!usernameInput) {
        alert("Please enter a valid username.");
        return;
    }

    // Update Session State
    AppState.currentUser.name = usernameInput;
    AppState.server.host = hostInput || "127.0.0.1";
    AppState.server.port = portInput || 8080;
    AppState.server.protocol = protocolInput;
    AppState.server.status = "CONNECTED";

    // Update User Client in Clients Directory
    let meClient = AppState.clients.find(c => c.isMe);
    if (meClient) {
        meClient.name = usernameInput;
    } else {
        meClient = {
            id: `c_${Date.now()}`,
            name: usernameInput,
            ip: AppState.currentUser.ip,
            port: AppState.currentUser.port,
            online: true,
            joinedAt: getCurrentTimestamp(),
            sentCount: 0,
            isMe: true
        };
        AppState.clients.unshift(meClient);
    }

    // Log socket connection event
    logActivity("CONNECTION", `Socket handshake successful for user ${usernameInput} -> ${AppState.server.host}:${AppState.server.port}`);

    // Update UI Header & Labels
    updateHeaderSessionUI();
    renderConnectedUsersList();
    renderClientsTable();
    updateSendTargetOptions();
    savePersistedData();

    closeLoginModal();
    showToast(`Connected to Chat Server (${AppState.server.host}:${AppState.server.port})`);
}

function connectServer() {
    if (AppState.server.status === "CONNECTED") {
        showToast("Server is already running and connected!");
        return;
    }

    AppState.server.status = "CONNECTING";
    updateServerStatusPill();

    setTimeout(() => {
        AppState.server.status = "CONNECTED";
        AppState.stats.connectionsCount++;
        logActivity("SERVER", `TCP Listener bound to ${AppState.server.host}:${AppState.server.port}`);
        logActivity("CONNECTION", `Client ${AppState.currentUser.name} re-established socket connection.`);
        
        // Mark all clients online
        AppState.clients.forEach(c => c.online = true);

        updateServerStatusPill();
        renderConnectedUsersList();
        renderClientsTable();
        updateDashboardMetrics();
        savePersistedData();
        showToast("Connected to Chat Server");
    }, 400);
}

function disconnectServer() {
    if (AppState.server.status === "DISCONNECTED") return;

    AppState.server.status = "DISCONNECTED";
    AppState.stats.disconnectionsCount++;

    logActivity("SERVER", `TCP Listener shut down on port ${AppState.server.port}`);
    logActivity("CONNECTION", `Client ${AppState.currentUser.name} disconnected from server`);

    // Mark clients offline
    AppState.clients.forEach(c => c.online = false);

    updateServerStatusPill();
    renderConnectedUsersList();
    renderClientsTable();
    updateDashboardMetrics();
    savePersistedData();
    showToast("Disconnected from Chat Server");
}

function restartServer() {
    logActivity("SERVER", "Initiating server restart sequence...");
    disconnectServer();

    setTimeout(() => {
        AppState.server.startTime = new Date();
        connectServer();
        showToast("Server restarted successfully!");
    }, 600);
}

// --- MESSAGE BROADCAST & UNICAST CORE ENGINE ---

/**
 * Sends a message from the active user (Shyam).
 * Evaluates target ('ALL' for broadcast, or specific Client Name for private message).
 */
function sendMessage() {
    const inputField = document.getElementById("chat-message-input");
    const text = inputField.value.trim();
    const targetSelect = document.getElementById("send-target-select");
    const targetValue = targetSelect.value; // 'ALL' or client name

    if (!text) return;

    if (AppState.server.status !== "CONNECTED") {
        alert("Cannot send message. Server is currently DISCONNECTED.");
        return;
    }

    const timestamp = getCurrentTimestamp();
    const isBroadcast = (targetValue === "ALL");

    // Construct Payload Packet
    const packet = {
        id: `msg_${Date.now()}`,
        sender: AppState.currentUser.name,
        senderIp: AppState.currentUser.ip,
        target: targetValue,
        text: text,
        timestamp: timestamp,
        isPrivate: !isBroadcast,
        isSystem: false
    };

    // Apply simulated latency delay if configured
    const delay = parseInt(AppState.settings.latency, 10) || 0;

    setTimeout(() => {
        // Process message through simulated central server socket pipeline
        processIncomingServerPacket(packet);

        // Clear input field
        inputField.value = "";
        updateCharCounter();
        toggleEmojiPicker(true); // close picker if open
    }, delay);
}

/**
 * Server Packet Dispatcher
 * Simulates central server processing, fan-out broadcast, logging & metrics.
 */
function processIncomingServerPacket(packet) {
    // 1. Record Message in Central Store
    AppState.messages.push(packet);
    AppState.stats.messagesSent++;
    AppState.stats.messagesReceived++;

    // Increment sender stats
    const senderClient = AppState.clients.find(c => c.name === packet.sender);
    if (senderClient) senderClient.sentCount++;

    // 2. Server Event Logging
    if (packet.target === "ALL") {
        const recipientCount = AppState.clients.filter(c => c.online && c.name !== packet.sender).length;
        logActivity("MESSAGE", `Packet received from ${packet.sender} (${packet.senderIp})`);
        logActivity("BROADCAST", `Message broadcasted to ${recipientCount} active clients`);
        showToast(`Message broadcasted to ${recipientCount} clients`);
    } else {
        logActivity("MESSAGE", `Private packet received from ${packet.sender} for ${packet.target}`);
        showToast(`Private message sent to ${packet.target}`);
    }

    // 3. Render Message in Chat Feed
    renderSingleChatMessage(packet);
    scrollChatToBottom();

    // 4. Update Dashboard Metrics
    updateDashboardMetrics();
    renderClientsTable();
    savePersistedData();

    // 5. Trigger Automated Client Bot Responses (if Broadcast & AutoReply enabled)
    if (packet.target === "ALL" && AppState.settings.autoReply && packet.sender === AppState.currentUser.name) {
        triggerSimulatedBotReplies(packet.text);
    }
}

/**
 * Simulates automated client responses (Rahul, Priya) when a broadcast message is sent.
 */
function triggerSimulatedBotReplies(userText) {
    const textLower = userText.toLowerCase();

    setTimeout(() => {
        let rahulResponse = "Hi Shyam!";
        if (textLower.includes("hello") || textLower.includes("hi")) {
            rahulResponse = "Hi Shyam! Ready for the Networks presentation.";
        } else if (textLower.includes("project") || textLower.includes("networks")) {
            rahulResponse = "The client-server architecture looks super smooth!";
        } else {
            rahulResponse = "Received your broadcast packet 👍";
        }

        const rahulPacket = {
            id: `msg_bot_${Date.now()}_1`,
            sender: "Rahul",
            senderIp: "192.168.1.102",
            target: "ALL",
            text: rahulResponse,
            timestamp: getCurrentTimestamp(),
            isPrivate: false,
            isSystem: false
        };

        processIncomingServerPacket(rahulPacket);

        // Secondary bot reply (Priya)
        setTimeout(() => {
            let priyaResponse = "Hello!";
            if (textLower.includes("hello") || textLower.includes("hi")) {
                priyaResponse = "Hello Shyam! Socket connected successfully.";
            } else {
                priyaResponse = "Packet received on port 8080! 🚀";
            }

            const priyaPacket = {
                id: `msg_bot_${Date.now()}_2`,
                sender: "Priya",
                senderIp: "192.168.1.103",
                target: "ALL",
                text: priyaResponse,
                timestamp: getCurrentTimestamp(),
                isPrivate: false,
                isSystem: false
            };

            processIncomingServerPacket(priyaPacket);
        }, 1200);

    }, 800);
}

/**
 * Manually simulate a client sending a message via the Client Simulator toolbar.
 */
function simulateClientMessage(clientName) {
    if (AppState.server.status !== "CONNECTED") {
        alert("Cannot simulate message while server is DISCONNECTED.");
        return;
    }

    const client = AppState.clients.find(c => c.name === clientName);
    if (!client) return;

    const sampleMessages = [
        `Hey everyone, testing network packet transmission!`,
        `Client ${clientName} reporting active status on TCP socket.`,
        `Multi-client broadcast working great!`,
        `Checking server latency... 2ms response time.`
    ];

    const randomMsg = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];

    const packet = {
        id: `msg_sim_${Date.now()}`,
        sender: clientName,
        senderIp: client.ip,
        target: "ALL",
        text: randomMsg,
        timestamp: getCurrentTimestamp(),
        isPrivate: false,
        isSystem: false
    };

    processIncomingServerPacket(packet);
}

function addCustomSimulatedClient() {
    const input = document.getElementById("new-client-name");
    const name = input.value.trim();

    if (!name) return;

    if (AppState.clients.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        alert("Client with this name already exists!");
        return;
    }

    const newIp = `192.168.1.${105 + AppState.clients.length}`;
    const newPort = 54325 + AppState.clients.length;

    const newClient = {
        id: `c_${Date.now()}`,
        name: name,
        ip: newIp,
        port: newPort,
        online: true,
        joinedAt: getCurrentTimestamp(),
        sentCount: 0,
        isMe: false
    };

    AppState.clients.push(newClient);
    AppState.stats.connectionsCount++;

    logActivity("CONNECTION", `New simulated client ${name} connected from ${newIp}:${newPort}`);

    input.value = "";
    renderConnectedUsersList();
    renderClientsTable();
    updateSendTargetOptions();
    updateDashboardMetrics();
    savePersistedData();
    showToast(`Simulated Client '${name}' connected`);
}

function promptAddClient() {
    const name = prompt("Enter Name for New Simulated Client:", "Vikram");
    if (name) {
        document.getElementById("new-client-name").value = name;
        addCustomSimulatedClient();
    }
}

function toggleClientStatus(clientId) {
    const client = AppState.clients.find(c => c.id === clientId);
    if (!client || client.isMe) return;

    client.online = !client.online;

    if (client.online) {
        AppState.stats.connectionsCount++;
        logActivity("CONNECTION", `Client ${client.name} reconnected`);
        showToast(`Client ${client.name} is now 🟢 Online`);
    } else {
        AppState.stats.disconnectionsCount++;
        logActivity("CONNECTION", `Client ${client.name} disconnected`);
        showToast(`Client ${client.name} is now 🔴 Offline`);
    }

    renderConnectedUsersList();
    renderClientsTable();
    updateDashboardMetrics();
    savePersistedData();
}

// --- DEMO SCENARIO SETUP ---
function injectDemoScenarioMessages() {
    const timestamp = getCurrentTimestamp();

    const welcomeSysMsg = {
        id: "msg_init_sys",
        sender: "Server",
        senderIp: "127.0.0.1",
        target: "ALL",
        text: "Connected to Central Chat Server (TCP Socket Port 8080)",
        timestamp: timestamp,
        isPrivate: false,
        isSystem: true
    };

    const initialBroadcast = {
        id: "msg_init_1",
        sender: "Shyam",
        senderIp: "192.168.1.101",
        target: "ALL",
        text: "Hello everyone!",
        timestamp: timestamp,
        isPrivate: false,
        isSystem: false
    };

    const rahulReply = {
        id: "msg_init_2",
        sender: "Rahul",
        senderIp: "192.168.1.102",
        target: "ALL",
        text: "Hi Shyam!",
        timestamp: timestamp,
        isPrivate: false,
        isSystem: false
    };

    const priyaReply = {
        id: "msg_init_3",
        sender: "Priya",
        senderIp: "192.168.1.103",
        target: "ALL",
        text: "Hello!",
        timestamp: timestamp,
        isPrivate: false,
        isSystem: false
    };

    AppState.messages = [welcomeSysMsg, initialBroadcast, rahulReply, priyaReply];
    AppState.stats.messagesSent = 3;
    AppState.stats.messagesReceived = 3;
}

// --- UI RENDERING & RENDERING HELPERS ---

function renderAllViews() {
    updateHeaderSessionUI();
    renderConnectedUsersList();
    renderChatMessagesFeed();
    updateSendTargetOptions();
    renderClientsTable();
    updateDashboardMetrics();
    renderActivityLogs();
}

function updateHeaderSessionUI() {
    document.getElementById("display-user-name").textContent = AppState.currentUser.name;
    document.getElementById("display-server-address").textContent = `${AppState.server.host}:${AppState.server.port}`;
    document.getElementById("chat-host-port").textContent = `${AppState.server.host}:${AppState.server.port}`;
    updateServerStatusPill();
}

function updateServerStatusPill() {
    const statusPill = document.getElementById("status-pill");
    const statusDot = document.getElementById("status-dot");
    const statusText = document.getElementById("status-text");
    const sidebarStatus = document.getElementById("quick-server-status");
    const chatServerStatus = document.getElementById("chat-server-status");

    if (AppState.server.status === "CONNECTED") {
        statusPill.className = "status-pill connected";
        statusDot.className = "pulse-dot green";
        statusText.textContent = "Connected";
        if (sidebarStatus) {
            sidebarStatus.className = "status-indicator online";
            sidebarStatus.textContent = "ONLINE";
        }
        if (chatServerStatus) {
            chatServerStatus.className = "text-success";
            chatServerStatus.textContent = "🟢 Connected";
        }
    } else if (AppState.server.status === "DISCONNECTED") {
        statusPill.className = "status-pill disconnected";
        statusDot.className = "pulse-dot red";
        statusText.textContent = "Disconnected";
        if (sidebarStatus) {
            sidebarStatus.className = "status-indicator offline";
            sidebarStatus.style.background = "rgba(244,63,94,0.2)";
            sidebarStatus.style.color = "var(--accent-rose)";
            sidebarStatus.textContent = "OFFLINE";
        }
        if (chatServerStatus) {
            chatServerStatus.className = "text-danger";
            chatServerStatus.style.color = "var(--accent-rose)";
            chatServerStatus.textContent = "🔴 Disconnected";
        }
    } else {
        statusPill.className = "status-pill connecting";
        statusDot.className = "pulse-dot warning";
        statusText.textContent = "Connecting...";
    }
}

function renderConnectedUsersList() {
    const listContainer = document.getElementById("connected-users-list");
    const countBadge = document.getElementById("client-list-badge");
    const activeCountTag = document.getElementById("chat-active-count");

    if (!listContainer) return;

    const activeCount = AppState.clients.filter(c => c.online).length;
    countBadge.textContent = AppState.clients.length;
    if (activeCountTag) activeCountTag.textContent = `${activeCount} Active`;

    listContainer.innerHTML = AppState.clients.map(client => `
        <div class="user-item">
            <div class="user-avatar ${client.isMe ? 'me' : ''}">
                ${client.name.charAt(0).toUpperCase()}
                <span class="status-dot ${client.online ? 'online' : 'offline'}"></span>
            </div>
            <div class="user-details">
                <span class="user-name-text">${escapeHTML(client.name)} ${client.isMe ? '(You)' : ''}</span>
                <span class="user-ip-text">${client.ip}:${client.port}</span>
            </div>
        </div>
    `).join("");
}

function updateSendTargetOptions() {
    const select = document.getElementById("send-target-select");
    if (!select) return;

    const currentVal = select.value;

    let optionsHTML = `<option value="ALL">📢 Everyone (Broadcast)</option>`;
    AppState.clients.forEach(c => {
        if (!c.isMe) {
            optionsHTML += `<option value="${escapeHTML(c.name)}">🔒 Private: ${escapeHTML(c.name)} (${c.online ? 'Online' : 'Offline'})</option>`;
        }
    });

    select.innerHTML = optionsHTML;

    // Restore selected value if still valid
    if (Array.from(select.options).some(o => o.value === currentVal)) {
        select.value = currentVal;
    } else {
        select.value = "ALL";
    }

    updateSendTarget();
}

function updateSendTarget() {
    const select = document.getElementById("send-target-select");
    const targetTitle = document.getElementById("current-channel-title");
    const targetDesc = document.getElementById("channel-target-desc");

    if (!select || !targetTitle || !targetDesc) return;

    if (select.value === "ALL") {
        targetTitle.textContent = "Central Broadcast Server";
        targetDesc.textContent = "Broadcasting to all connected TCP clients";
    } else {
        targetTitle.textContent = `Private Channel: ${select.value}`;
        targetDesc.textContent = `End-to-End Unicast Socket Transmission to ${select.value}`;
    }
}

function renderChatMessagesFeed() {
    const container = document.getElementById("chat-messages-container");
    if (!container) return;

    container.innerHTML = "";
    AppState.messages.forEach(msg => {
        renderSingleChatMessage(msg);
    });
    scrollChatToBottom();
}

function renderSingleChatMessage(msg) {
    const container = document.getElementById("chat-messages-container");
    if (!container) return;

    if (msg.isSystem) {
        const sysElement = document.createElement("div");
        sysElement.className = "system-msg";
        sysElement.innerHTML = `<span>⚡ [SERVER] ${escapeHTML(msg.text)} — ${msg.timestamp}</span>`;
        container.appendChild(sysElement);
        return;
    }

    const isSent = (msg.sender === AppState.currentUser.name);
    const bubbleRow = document.createElement("div");
    
    let bubbleClass = `message-bubble-row ${isSent ? 'sent' : 'received'}`;
    if (msg.isPrivate) bubbleClass += " private";
    
    bubbleRow.className = bubbleClass;
    bubbleRow.setAttribute("data-msg-id", msg.id);

    const targetBadge = msg.isPrivate 
        ? `<span class="target-tag">🔒 Private to ${escapeHTML(msg.target)}</span>` 
        : ``;

    bubbleRow.innerHTML = `
        <div class="msg-avatar">${msg.sender.charAt(0).toUpperCase()}</div>
        <div class="msg-content-box">
            <div class="msg-header-meta">
                <span class="sender-name">${escapeHTML(msg.sender)}</span>
                ${targetBadge}
                <span class="msg-time">${msg.timestamp}</span>
            </div>
            <div class="msg-body">${escapeHTML(msg.text)}</div>
        </div>
    `;

    container.appendChild(bubbleRow);
}

function scrollChatToBottom() {
    const container = document.getElementById("chat-messages-container");
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function filterChatMessages() {
    const searchInput = document.getElementById("chat-search-input").value.toLowerCase();
    const rows = document.querySelectorAll("#chat-messages-container .message-bubble-row");

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchInput)) {
            row.style.display = "flex";
        } else {
            row.style.display = "none";
        }
    });
}

function clearChatMessages() {
    if (confirm("Are you sure you want to clear chat history?")) {
        AppState.messages = [];
        renderChatMessagesFeed();
        savePersistedData();
        showToast("Chat history cleared.");
    }
}

// --- EMOJI PICKER & TEXT COUNTER ---
function toggleEmojiPicker(forceClose = false) {
    const picker = document.getElementById("emoji-picker");
    if (!picker) return;

    if (forceClose) {
        picker.classList.add("hidden");
    } else {
        picker.classList.toggle("hidden");
    }
}

function insertEmoji(emoji) {
    const input = document.getElementById("chat-message-input");
    input.value += emoji;
    updateCharCounter();
    input.focus();
}

function updateCharCounter() {
    const input = document.getElementById("chat-message-input");
    const counter = document.getElementById("char-counter");
    if (input && counter) {
        const length = input.value.length;
        counter.textContent = `${length} / 500`;
        counter.style.color = length > 450 ? "var(--accent-rose)" : "var(--text-dim)";
    }
}

// --- DASHBOARD METRICS & CLIENTS TABLE ---

function updateDashboardMetrics() {
    const activeClients = AppState.clients.filter(c => c.online).length;

    const elActive = document.getElementById("stat-active-clients");
    const elSent = document.getElementById("stat-messages-sent");
    const elRecv = document.getElementById("stat-messages-recv");
    const elConn = document.getElementById("stat-connections");
    const elDisconn = document.getElementById("stat-disconnections");
    const elSidebarCount = document.getElementById("chat-active-count");

    if (elActive) elActive.textContent = activeClients;
    if (elSent) elSent.textContent = AppState.stats.messagesSent;
    if (elRecv) elRecv.textContent = AppState.stats.messagesReceived;
    if (elConn) elConn.textContent = AppState.stats.connectionsCount;
    if (elDisconn) elDisconn.textContent = AppState.stats.disconnectionsCount;
    if (elSidebarCount) elSidebarCount.textContent = `${activeClients} Active`;
}

function renderClientsTable() {
    const tbody = document.getElementById("clients-table-body");
    if (!tbody) return;

    tbody.innerHTML = AppState.clients.map(c => `
        <tr>
            <td>
                <strong>${escapeHTML(c.name)}</strong>
                ${c.isMe ? ' <span class="badge badge-cyan">You</span>' : ''}
            </td>
            <td><code>${c.ip}</code></td>
            <td><code>${c.port}</code></td>
            <td>
                <span class="status-pill ${c.online ? 'connected' : 'disconnected'}">
                    ${c.online ? '🟢 Online' : '🔴 Offline'}
                </span>
            </td>
            <td>${c.sentCount} msgs</td>
            <td>${c.joinedAt}</td>
            <td>
                ${!c.isMe ? `
                    <button class="btn btn-xs ${c.online ? 'btn-outline-danger' : 'btn-outline-primary'}" onclick="toggleClientStatus('${c.id}')">
                        ${c.online ? 'Disconnect' : 'Reconnect'}
                    </button>
                    <button class="btn btn-xs btn-outline-cyan" onclick="simulateClientMessage('${escapeHTML(c.name)}')">
                        Simulate Msg
                    </button>
                ` : '<span class="text-dim">Current Session</span>'}
            </td>
        </tr>
    `).join("");
}

// --- SERVER ACTIVITY LOGGING ---

function logActivity(tag, message) {
    const timestamp = getCurrentTimestamp();
    const logItem = {
        id: `log_${Date.now()}`,
        timestamp: timestamp,
        tag: tag, // CONNECTION, MESSAGE, BROADCAST, SERVER
        message: message
    };

    AppState.logs.unshift(logItem);
    if (AppState.logs.length > 200) AppState.logs.pop(); // limit memory

    renderActivityLogs();
}

function renderActivityLogs() {
    const container = document.getElementById("terminal-body");
    const filterSelect = document.getElementById("log-filter-select");
    if (!container) return;

    const filterVal = filterSelect ? filterSelect.value : "ALL";

    const filteredLogs = AppState.logs.filter(log => {
        if (filterVal === "ALL") return true;
        return log.tag === filterVal;
    });

    container.innerHTML = filteredLogs.map(log => `
        <div class="log-line">
            <span class="log-time">[${log.timestamp}]</span>
            <span class="log-tag ${log.tag}">${log.tag}</span>
            <span class="log-msg">${escapeHTML(log.message)}</span>
        </div>
    `).join("");
}

function clearActivityLogs() {
    AppState.logs = [];
    renderActivityLogs();
    showToast("Activity logs cleared.");
}

function exportLogs() {
    const textContent = AppState.logs.map(l => `[${l.timestamp}] [${l.tag}] ${l.message}`).join("\n");
    const blob = new Blob([textContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `netsocket_server_activity_${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
}

// --- SETTINGS & CONFIGURATION ---

function updateSimulationSettings() {
    const latencySelect = document.getElementById("setting-latency");
    const autoReplyCheck = document.getElementById("setting-auto-reply");

    if (latencySelect) AppState.settings.latency = parseInt(latencySelect.value, 10);
    if (autoReplyCheck) AppState.settings.autoReply = autoReplyCheck.checked;

    savePersistedData();
    showToast("Simulation settings updated");
}

function updateServerConfig() {
    const portInput = document.getElementById("setting-server-port");
    if (portInput) {
        const newPort = parseInt(portInput.value, 10);
        if (newPort >= 1024 && newPort <= 65535) {
            AppState.server.port = newPort;
            updateHeaderSessionUI();
            logActivity("SERVER", `Server listening port updated to ${newPort}`);
            savePersistedData();
        }
    }
}

function resetAllAppData() {
    if (confirm("Are you sure you want to reset all application data and restore defaults?")) {
        localStorage.removeItem("NETSOCKET_SIMULATOR_STATE");
        location.reload();
    }
}

// --- TIMERS & UTILITIES ---

function startUptimeClock() {
    setInterval(() => {
        if (AppState.server.status !== "CONNECTED") return;

        const now = new Date();
        const diffMs = now - new Date(AppState.server.startTime);
        const diffSecs = Math.floor(diffMs / 1000);

        const hrs = String(Math.floor(diffSecs / 3600)).padStart(2, '0');
        const mins = String(Math.floor((diffSecs % 3600) / 60)).padStart(2, '0');
        const secs = String(diffSecs % 60).padStart(2, '0');

        const timeStr = `${hrs}:${mins}:${secs}`;

        const sidebarUptime = document.getElementById("sidebar-uptime");
        const statUptime = document.getElementById("stat-uptime");

        if (sidebarUptime) sidebarUptime.textContent = timeStr;
        if (statUptime) statUptime.textContent = timeStr;

        // Dynamic Packet Flow Bar Animation
        animateVisualizerBars();
    }, 1000);
}

function animateVisualizerBars() {
    const bars = document.querySelectorAll(".visualizer-bar");
    bars.forEach(bar => {
        const randomHeight = Math.floor(Math.random() * 70) + 20; // 20% to 90%
        bar.style.height = `${randomHeight}%`;
    });
}

function getCurrentTimestamp() {
    const now = new Date();
    return now.toTimeString().split(' ')[0]; // "HH:MM:SS"
}

function showToast(message) {
    const toast = document.getElementById("broadcast-toast");
    const toastMsg = document.getElementById("toast-message");

    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.classList.remove("hidden");

    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
        toast.classList.add("hidden");
    }, 3500);
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m];
    });
}

// --- LOCAL STORAGE PERSISTENCE ---

function savePersistedData() {
    try {
        const payload = {
            currentUser: AppState.currentUser,
            server: AppState.server,
            stats: AppState.stats,
            clients: AppState.clients,
            messages: AppState.messages.slice(-50), // keep last 50
            logs: AppState.logs.slice(-50),
            settings: AppState.settings
        };
        localStorage.setItem("NETSOCKET_SIMULATOR_STATE", JSON.stringify(payload));
    } catch (e) {
        console.warn("Could not save to LocalStorage:", e);
    }
}

function loadPersistedData() {
    try {
        const saved = localStorage.getItem("NETSOCKET_SIMULATOR_STATE");
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.currentUser) AppState.currentUser = parsed.currentUser;
            if (parsed.server) AppState.server = parsed.server;
            if (parsed.stats) AppState.stats = parsed.stats;
            if (parsed.clients) AppState.clients = parsed.clients;
            if (parsed.messages) AppState.messages = parsed.messages;
            if (parsed.logs) AppState.logs = parsed.logs;
            if (parsed.settings) AppState.settings = parsed.settings;
            AppState.server.startTime = new Date(); // reset uptime for current session
        }
    } catch (e) {
        console.warn("Failed to load from LocalStorage:", e);
    }
}
