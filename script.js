async function fetchHtmlContent(pubhtmlUrl) {
    const response = await fetch(pubhtmlUrl);
    const html = await response.text();
    console.log('Fetched HTML:', html); // Debugging line
    return html;
}

function parseHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('table tr');
    
    const data = Array.from(rows).slice(1).map(row => {
        const cells = row.querySelectorAll('td');
        return {
            timestamp: cells[0]?.innerText.trim() || '',
            message: cells[1]?.innerText.trim() || '',
            signature: cells[2]?.innerText.trim() || ''
        };
    });

    console.log('Parsed Data:', data); // Debugging line
    return data;
}

function displayMessages(data) {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.innerHTML = ''; // Clear existing messages
    data.forEach(entry => {
        const chatBubble = document.createElement('div');
        chatBubble.className = 'chat-bubble';
        
        const chatTimestamp = document.createElement('div');
        chatTimestamp.className = 'timestamp';
        chatTimestamp.textContent = entry.timestamp;

        const chatMessage = document.createElement('div');
        chatMessage.className = 'message';
        chatMessage.textContent = entry.message;

        const chatSignature = document.createElement('div');
        chatSignature.className = 'signature';
        chatSignature.textContent = `- ${entry.signature}`;

        chatBubble.appendChild(chatTimestamp);
        chatBubble.appendChild(chatMessage);
        chatBubble.appendChild(chatSignature);
        
        chatContainer.appendChild(chatBubble);
    });
}

function fetchDataAndUpdate() {
    const pubhtmlUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQazrkD8DxsLDMhQ4X78vjlIjq1wos7C-0dge7NDG0EBkJ7jhePsJYXCGUvMV79GaNcAa1hJYS_M-5Z/pubhtml';
    fetchHtmlContent(pubhtmlUrl).then(html => {
        const data = parseHtml(html);
        displayMessages(data);
    });
}

// Fetch data initially
fetchDataAndUpdate();

// Set interval to refresh data every 10 seconds (10000 milliseconds)
setInterval(fetchDataAndUpdate, 10000);
