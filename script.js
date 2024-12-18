async function fetchSheetData() {
    const response = await fetch('https://spreadsheets.google.com/feeds/list/2PACX-1vQazrkD8DxsLDMhQ4X78vjlIjq1wos7C-0dge7NDG0EBkJ7jhePsJYXCGUvMV79GaNcAa1hJYS_M-5Z/od6/public/values?alt=json');
    const data = await response.json();
    return data.feed.entry;
}

function displayMessages(entries) {
    const chatContainer = document.getElementById('chat-container');
    entries.forEach(entry => {
        const message = entry.gsx$message.$t;
        const signature = entry.gsx$signature.$t;

        const chatBubble = document.createElement('div');
        chatBubble.className = 'chat-bubble';
        chatBubble.textContent = message;

        const chatSignature = document.createElement('div');
        chatSignature.className = 'signature';
        chatSignature.textContent = `- ${signature}`;

        chatContainer.appendChild(chatBubble);
        chatContainer.appendChild(chatSignature);
    });
}

fetchSheetData().then(entries => displayMessages(entries));
