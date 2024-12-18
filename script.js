async function fetchHtmlContent(pubhtmlUrl) {
    const response = await fetch(pubhtmlUrl);
    const html = await response.text();
    return html;
}

function parseHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('table tr');
    
    const data = Array.from(rows).slice(1).map(row => {
        const cells = row.querySelectorAll('td');
        return {
            message: cells[0].innerText.trim(),
            signature: cells[1].innerText.trim()
        };
    });
    
    return data;
}

function displayMessages(data) {
    const chatContainer = document.getElementById('chat-container');
    data.forEach(entry => {
        const chatBubble = document.createElement('div');
        chatBubble.className = 'chat-bubble';
        chatBubble.textContent = entry.message;

        const chatSignature = document.createElement('div');
        chatSignature.className = 'signature';
        chatSignature.textContent = `- ${entry.signature}`;

        chatContainer.appendChild(chatBubble);
        chatContainer.appendChild(chatSignature);
    });
}

const pubhtmlUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQazrkD8DxsLDMhQ4X78vjlIjq1wos7C-0dge7NDG0EBkJ7jhePsJYXCGUvMV79GaNcAa1hJYS_M-5Z/pubhtml';
fetchHtmlContent(pubhtmlUrl).then(html => {
    const data = parseHtml(html);
    displayMessages(data);
});
