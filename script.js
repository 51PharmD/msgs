// Base64 Image Converter (Run once on load)
let base64Signature; // Global variable to store the result

async function prepareSignature() {
    const imgUrl = 'https://raw.githubusercontent.com/51PharmD/msgs/refs/heads/main/YusufAlhelou.png';
    try {
        const response = await fetch(imgUrl);
        const blob = await response.blob();
        base64Signature = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Failed to load signature:", error);
    }
}

// Initialize when page loads
prepareSignature();

let isFetching = false;
let currentData = [];
let isPollingActive = false;
let pollingInterval = null;
let currentFilter = 'all';

// Improved scroll function with reply expansion
function scrollToMessage() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    const messageElement = document.getElementById(`message-${hash}`);
    if (messageElement) {
        // Expand all parent threads when jumping to a message
        let currentElement = messageElement.parentElement;
        while (currentElement && currentElement.classList.contains('thread')) {
            currentElement.classList.remove('collapsed');
            const parentMessage = currentElement.previousElementSibling;
            if (parentMessage) {
                const toggle = parentMessage.querySelector('.reply-toggle');
                if (toggle) toggle.textContent = '▲';
            }
            currentElement = currentElement.parentElement;
        }

        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.classList.add('highlight');
        
        setTimeout(() => {
            messageElement.classList.remove('highlight');
        }, 2000);
    }
}

async function fetchHtmlContent(pubhtmlUrl) {
    const urlWithTimestamp = `${pubhtmlUrl}?t=${new Date().getTime()}`;
    const response = await fetch(urlWithTimestamp);
    return await response.text();
}

function parseHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('table tr');
    
    return Array.from(rows).slice(1).map(row => {
        const cells = row.querySelectorAll('td');
        return {
            timestamp: cells[0]?.innerText.trim() || '',
            message: cells[1]?.innerText.trim() || '',
            signature: cells[2]?.innerText.trim() || '',
            tag: cells[3]?.innerText.trim() || '' // 4th column for tags
        };
    });
}

function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

function extractMessageIdFromText(text) {
    const urlMatch = text.match(/https?:\/\/51pharmd\.github\.io\/msgs\/#(\d+)/i);
    return urlMatch ? urlMatch[1] : null;
}

function groupReplies(messages) {
    const replyMap = {};
    messages.forEach((msg, index) => {
        const replyToId = extractMessageIdFromText(msg.message);
        if (replyToId) {
            if (!replyMap[replyToId]) replyMap[replyToId] = [];
            replyMap[replyToId].push(index);
        }
    });
    return replyMap;
}

// Added filter function
function filterMessages(data) {
    switch(currentFilter) {
        case 'all':
            return data;
        case 'pinned':
            return data.filter(entry => entry.tag && entry.tag.includes('📌'));
        case 'latest':
            return data.slice(-5).reverse(); // Get last 5 and reverse to show newest first
        default:
            return data;
    }
}

function createMessageElement(entry, messageId, replyMap, isReply = false) {
    const chatWrapper = document.createElement('div');
    chatWrapper.className = `chat-wrapper ${isReply ? 'reply' : ''}`;
    chatWrapper.id = `message-${messageId}`;

    const chatBubble = document.createElement('div');
    chatBubble.className = 'chat-bubble';

    // Pin indicator
    if (entry.tag?.includes('📌')) {
        const pin = document.createElement('div');
        pin.className = 'pin-indicator';
        pin.textContent = '📌';
        chatBubble.appendChild(pin);
    }

    // Message decorations
    const wire = document.createElement('div');
    wire.className = 'wire';
    chatBubble.appendChild(wire);

    const lightsContainer = document.createElement('div');
    lightsContainer.className = 'lights';
    for (let i = 0; i < 8; i++) {
        const light = document.createElement('div');
        light.className = 'light';
        lightsContainer.appendChild(light);
    }
    chatBubble.appendChild(lightsContainer);

    // Message content
    const chatTimestamp = document.createElement('div');
    chatTimestamp.className = 'timestamp';
    chatTimestamp.textContent = entry.timestamp;

    const chatMessage = document.createElement('div');
    chatMessage.className = 'message';
    chatMessage.innerHTML = linkify(entry.message);

    const chatSignature = document.createElement('div');
    chatSignature.className = 'signature';
    chatSignature.textContent = `- ${entry.signature}`;

    // Add reply link if this is a reply
    const replyToId = extractMessageIdFromText(entry.message);
    if (replyToId) {
        const replyLink = document.createElement('a');
        replyLink.className = 'reply-link';
        replyLink.innerHTML = '↩ Replying to #' + replyToId;
        replyLink.href = `#${replyToId}`;
        replyLink.onclick = (e) => {
            e.preventDefault();
            window.location.hash = replyToId;
            scrollToMessage();
        };
        chatMessage.appendChild(document.createElement('br'));
        chatMessage.appendChild(replyLink);
    }

    // Add reply toggle if this message has replies
    if (replyMap[messageId]?.length) {
        const replyIndicator = document.createElement('div');
        replyIndicator.className = 'reply-indicator';
        
        const replyBadge = document.createElement('span');
        replyBadge.className = 'reply-badge';
        replyBadge.textContent = `💬 ${replyMap[messageId].length} ${replyMap[messageId].length === 1 ? 'Reply' : 'Replies'}`;
        
        const replyToggle = document.createElement('span');
        replyToggle.className = 'reply-toggle';
        replyToggle.textContent = '▼'; // Default collapsed state
        
        replyIndicator.appendChild(replyBadge);
        replyIndicator.appendChild(replyToggle);
        
        replyIndicator.addEventListener('click', (e) => {
            e.stopPropagation();
            const repliesContainer = chatWrapper.nextElementSibling;
            if (repliesContainer) {
                repliesContainer.classList.toggle('collapsed');
                replyToggle.textContent = repliesContainer.classList.contains('collapsed') ? '▼' : '▲';
            }
        });
        
        chatSignature.appendChild(replyIndicator);
    }

    // Signature image
    if (entry.tag?.includes('⚡') && base64Signature) {
        const signatureImg = document.createElement('img');
        signatureImg.src = base64Signature;
        signatureImg.className = 'signature-image';
        signatureImg.style.display = 'block';
        signatureImg.alt = 'Yusuf Alhelou';
        chatBubble.appendChild(signatureImg);
    }

    // Share button
    const shareButton = document.createElement('button');
    shareButton.className = 'share-button';
    shareButton.innerHTML = '🔗';
    shareButton.addEventListener('click', () => shareChatBubble(chatWrapper, messageId));

    // Assemble message
    chatBubble.appendChild(chatTimestamp);
    chatBubble.appendChild(chatMessage);
    chatBubble.appendChild(chatSignature);
    chatWrapper.appendChild(chatBubble);
    chatWrapper.appendChild(shareButton);

    return chatWrapper;
}

function displayMessages(data) {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.innerHTML = '';
    
    const filteredData = filterMessages(data);
    const replyMap = groupReplies(filteredData);
    const pinnedCount = data.filter(entry => entry.tag?.includes('📌')).length;

    // Update pinned button
    const pinnedButton = document.querySelector('[data-filter="pinned"]');
    if (pinnedButton) {
        pinnedButton.textContent = pinnedCount > 0 ? `Pinned 📌 [${pinnedCount}]` : 'Pinned 📌';
    }

    // Create all top-level messages first
    filteredData.forEach((entry, index) => {
        const isReply = extractMessageIdFromText(entry.message);
        if (isReply) return; // Skip replies in first pass
        
        const messageId = index + 1;
        const hasReplies = replyMap[messageId]?.length > 0;
        
        // Create message container
        const messageElement = createMessageElement(entry, messageId, replyMap);
        
        if (hasReplies) {
            // Create thread container
            const threadContainer = document.createElement('div');
            threadContainer.className = 'thread-container';
            
            // Add message and replies container
            threadContainer.appendChild(messageElement);
            
            const repliesContainer = document.createElement('div');
            repliesContainer.className = 'thread collapsed'; // Hidden by default
            
            // Add replies
            replyMap[messageId].forEach(replyIndex => {
                const replyEntry = filteredData[replyIndex];
                const replyId = replyIndex + 1;
                const replyElement = createMessageElement(replyEntry, replyId, replyMap, true);
                repliesContainer.appendChild(replyElement);
            });
            
            threadContainer.appendChild(repliesContainer);
            chatContainer.appendChild(threadContainer);
        } else {
            // No replies, just add the message
            chatContainer.appendChild(messageElement);
        }
    });

    scrollToMessage();
}

async function fetchDataAndUpdate() {
    if (isFetching || !isPollingActive) return;
    isFetching = true;

    try {
        const pubhtmlUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQazrkD8DxsLDMhQ4X78vjlIjq1wos7C-0dge7NDG0EBkJ7jhePsJYXCGUvMV79GaNcAa1hJYS_M-5Z/pubhtml';
        const html = await fetchHtmlContent(pubhtmlUrl);
        const newData = parseHtml(html);
        
        if (JSON.stringify(newData) !== JSON.stringify(currentData)) {
            currentData = newData;
            displayMessages(newData);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        isFetching = false;
    }
}

// Load Messages Button
document.getElementById('loadMessagesBtn').addEventListener('click', function() {
    this.style.display = 'none';
    isPollingActive = true;
    document.getElementById('filterButtons').classList.remove('hidden');
    fetchDataAndUpdate();
    pollingInterval = setInterval(() => {
        if (isPollingActive) {
            fetchDataAndUpdate();
        }
    }, 30000);
});

// Filter button click handler
document.querySelectorAll('.filter-button').forEach(button => {
    button.addEventListener('click', function() {
        document.querySelectorAll('.filter-button').forEach(btn => {
            btn.classList.remove('active');
        });
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        displayMessages(currentData);
    });
});

// Form Toggle
document.getElementById('toggleFormButton').addEventListener('click', () => {
    const formContainer = document.getElementById('formContainer');
    const cloudWindow = document.getElementById('cloudWindow');
    
    if (formContainer.classList.contains('hidden')) {
        formContainer.classList.remove('hidden');
        document.getElementById('toggleFormButton').textContent = 'Close Form';
        if (!cloudWindow.classList.contains('hidden')) {
            cloudWindow.classList.add('hidden');
            document.getElementById('toggleCloudButton').textContent = 'Enter The Cloud';
        }
        isPollingActive = false;
    } else {
        formContainer.classList.add('hidden');
        document.getElementById('toggleFormButton').textContent = 'Open Form';
        if (pollingInterval !== null) {
            isPollingActive = true;
            fetchDataAndUpdate();
        }
    }
});

// Cloud Toggle
document.getElementById('toggleCloudButton').addEventListener('click', () => {
    const cloudWindow = document.getElementById('cloudWindow');
    const formContainer = document.getElementById('formContainer');
    
    cloudWindow.classList.toggle('hidden');
    document.getElementById('toggleCloudButton').textContent = 
        cloudWindow.classList.contains('hidden') ? 'Enter The Cloud' : 'Exit The Cloud';
    
    if (!cloudWindow.classList.contains('hidden')) {
        if (!formContainer.classList.contains('hidden')) {
            formContainer.classList.add('hidden');
            document.getElementById('toggleFormButton').textContent = 'Open Form';
        }
        isPollingActive = false;
    } else {
        if (pollingInterval !== null) {
            isPollingActive = true;
        }
    }
});

// Event Listeners
window.addEventListener('hashchange', scrollToMessage);

document.getElementById('scrollToBottomButton').addEventListener('click', () => {
    document.getElementById('bottom-of-page').scrollIntoView({ behavior: 'smooth' });
});

async function shareChatBubble(chatWrapper, messageId) {
    const shareButton = chatWrapper.querySelector('.share-button');
    shareButton.style.display = 'none';

    const existingOptions = chatWrapper.querySelector('.share-options');
    if (existingOptions) {
        chatWrapper.removeChild(existingOptions);
        shareButton.style.display = 'block';
        return;
    }

    const canvas = await html2canvas(chatWrapper, { backgroundColor: '#e4e0d7' });
    const imgData = canvas.toDataURL("image/png");
    shareButton.style.display = 'block';

    const urlWithoutHash = window.location.href.split('#')[0];
    const fullMessageText = chatWrapper.querySelector('.message').textContent;
    const snippetLength = 100;
    const snippetText = fullMessageText.length > snippetLength ? fullMessageText.substring(0, snippetLength) + '...' : fullMessageText;
    const shareText = `${snippetText} —  ممكن تكتب رد هنا!\n`;

    const shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(urlWithoutHash + '#' + messageId)}`;

    const downloadButton = document.createElement('button');
    downloadButton.className = 'emoji-button';
    downloadButton.innerHTML = '📸';
    downloadButton.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `message-${messageId}.png`;
        link.click();
    });

    const twitterButton = document.createElement('button');
    twitterButton.className = 'emoji-button';
    twitterButton.innerHTML = '🐦';
    twitterButton.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = shareLink;
        link.target = '_blank';
        link.click();
    });

    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'share-options';
    optionsContainer.appendChild(downloadButton);
    optionsContainer.appendChild(twitterButton);

    chatWrapper.appendChild(optionsContainer);
}
