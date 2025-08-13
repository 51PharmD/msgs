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

// Handle hash-based routing
function handleHashRouting() {
    const hash = window.location.hash.substring(1);
    
    // Check if hash is a message ID (numbers only)
    if (/^\d+$/.test(hash)) {
        scrollToMessage();
        return;
    }
    
    // Handle filter routes
    const validFilters = ['all', 'pinned', 'latest'];
    if (validFilters.includes(hash)) {
        currentFilter = hash;
        // Update active button
        document.querySelectorAll('.filter-button').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === hash) {
                btn.classList.add('active');
            }
        });
        if (currentData.length) displayMessages(currentData);
    }
}

// Improved scroll function with reply expansion
function scrollToMessage() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    // If hash is a filter, not a message ID
    if (['all', 'pinned', 'latest'].includes(hash)) return;

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
        const chatBubble = messageElement.querySelector('.chat-bubble');
        if (chatBubble) {
            chatBubble.classList.add('highlight');
            setTimeout(() => {
                chatBubble.classList.remove('highlight');
            }, 2000);
        }
    }
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
    messages.forEach((msg) => {
        const replyToId = extractMessageIdFromText(msg.message);
        if (replyToId) {
            if (!replyMap[replyToId]) replyMap[replyToId] = [];
            replyMap[replyToId].push(msg.rowNumber);
        }
    });
    return replyMap;
}

function filterMessages(data) {
    switch(currentFilter) {
        case 'all': return data;
        case 'pinned': return data.filter(entry => entry.tag?.includes('📌')).reverse();
        case 'latest': return data.slice(-10).reverse();
        default: return data;
    }
}

function createMessageElement(entry, rowNumber, replyMap, isReply = false) {
    const chatWrapper = document.createElement('div');
    chatWrapper.className = `chat-wrapper ${isReply ? 'reply' : ''}`;
    chatWrapper.id = `message-${rowNumber}`;

    const chatBubble = document.createElement('div');
    chatBubble.className = 'chat-bubble';

    // Create clickable message number badge
    const messageNumberBadge = document.createElement('div');
    messageNumberBadge.className = 'message-number';
    messageNumberBadge.textContent = `#${rowNumber}`;
    messageNumberBadge.title = "Click to copy message link";
    
    // Add click handler to copy message link
    messageNumberBadge.addEventListener('click', (e) => {
        e.stopPropagation();
const messageUrl = `${window.location.origin}${window.location.pathname}#${rowNumber} \n`; // ← Space added
        navigator.clipboard.writeText(messageUrl).then(() => {
            // Visual feedback
            const originalText = messageNumberBadge.textContent;
            messageNumberBadge.textContent = "Copied!";
            messageNumberBadge.classList.add('copied');
            
            setTimeout(() => {
                messageNumberBadge.textContent = originalText;
                messageNumberBadge.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    });

    chatBubble.appendChild(messageNumberBadge);
    
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
    if (replyMap[rowNumber]?.length) {
        const replyIndicator = document.createElement('div');
replyIndicator.className = 'reply-indicator';
replyIndicator.innerHTML = `
  <span class="reply-badge">
    💬 ${replyMap[rowNumber].length} ${replyMap[rowNumber].length === 1 ? 'Reply' : 'Replies'} 
    <span class="reply-toggle">▼</span>
  </span>
`;
        replyIndicator.addEventListener('click', (e) => {
  e.stopPropagation();
  const repliesContainer = chatWrapper.nextElementSibling;
  if (repliesContainer && repliesContainer.classList.contains('thread')) {
    repliesContainer.classList.toggle('collapsed');
    const toggle = replyIndicator.querySelector('.reply-toggle');
    toggle.textContent = repliesContainer.classList.contains('collapsed') ? '▼' : '▲';
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
    shareButton.addEventListener('click', () => shareChatBubble(chatWrapper, rowNumber));

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
    const replyMap = groupReplies(data); // Use full data for reply mapping
    const pinnedCount = data.filter(entry => entry.tag?.includes('📌')).length;

    // Update pinned button
    const pinnedButton = document.querySelector('[data-filter="pinned"]');
    if (pinnedButton) {
        pinnedButton.textContent = pinnedCount > 0 ? `Pinned 📌 [${pinnedCount}]` : 'Pinned 📌';
    }

    // Create all messages based on current filter
    filteredData.forEach((entry) => {
        const isReply = extractMessageIdFromText(entry.message);
        
        // For pinned filter, we want to show all pinned messages including replies
        if (currentFilter === 'pinned' || !isReply) {
            const hasReplies = replyMap[entry.rowNumber]?.length > 0;
            
            // Create message container
            const messageElement = createMessageElement(entry, entry.rowNumber, replyMap, isReply);
            
            if (hasReplies) {
                // Create thread container
                const threadContainer = document.createElement('div');
                threadContainer.className = 'thread-container';
                
                // Add message and replies container
                threadContainer.appendChild(messageElement);
                
                const repliesContainer = document.createElement('div');
                repliesContainer.className = 'thread collapsed';
                
                // Process replies
                replyMap[entry.rowNumber].forEach(replyRowNumber => {
                    const replyEntry = data.find(e => e.rowNumber === replyRowNumber);
                    if (replyEntry) {
                        const replyElement = createMessageElement(replyEntry, replyRowNumber, replyMap, true);
                        repliesContainer.appendChild(replyElement);
                        
                        // Handle nested replies
                        if (replyMap[replyRowNumber]?.length) {
                            const nestedRepliesContainer = document.createElement('div');
                            nestedRepliesContainer.className = 'thread collapsed';
                            
                            replyMap[replyRowNumber].forEach(nestedReplyRowNumber => {
                                const nestedEntry = data.find(e => e.rowNumber === nestedReplyRowNumber);
                                if (nestedEntry) {
                                    nestedRepliesContainer.appendChild(
                                        createMessageElement(nestedEntry, nestedReplyRowNumber, replyMap, true)
                                    );
                                }
                            });
                            
                            repliesContainer.appendChild(nestedRepliesContainer);
                        }
                    }
                });
                
                threadContainer.appendChild(repliesContainer);
                chatContainer.appendChild(threadContainer);
            } else {
                // No replies, just add the message
                chatContainer.appendChild(messageElement);
            }
        }
    });

    scrollToMessage();
}

async function fetchDataAndUpdate() {
    if (isFetching || !isPollingActive) return;
    isFetching = true;

    try {
        // --- THIS IS THE NEW CODE ---
        const webAppUrl = 'https://script.google.com/macros/s/AKfycbxeeifi8ozgTCJrJQtn56hrWfeak7823Ko7MlQV2Xe8saLQyPuSpaYzMtW5-8npmBHZqQ/exec';
        const response = await fetch(webAppUrl);
        const rawData = await response.json();
        
        // Add a rowNumber to each entry for compatibility
        const newData = rawData.map((entry, index) => ({
            ...entry,
            rowNumber: index + 1, // +2 because row 1 is headers, and spreadsheet rows are 1-based
        }));

        if (JSON.stringify(newData) !== JSON.stringify(currentData)) {
            currentData = newData;
            displayMessages(newData);
        }
        // --- END OF NEW CODE ---
        
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
    
    // Check URL hash for initial filter
    handleHashRouting();
    
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
        
        // Update URL hash
        window.location.hash = currentFilter;
        
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
window.addEventListener('hashchange', handleHashRouting);
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
    const snippetText = fullMessageText.length > snippetLength ? 
        fullMessageText.substring(0, snippetLength) + '...' : 
        fullMessageText;
    
    // Use your previous share text format
    const shareText = `${snippetText} —  ممكن تكتب رد هنا!\n`;
    
    // Use your previous Twitter share link format
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
        // Use your previous Twitter sharing method
        const link = document.createElement('a');
        link.href = shareLink;
        link.target = '_blank';
        link.click();
    });

    const copyLinkButton = document.createElement('button');
copyLinkButton.className = 'emoji-button';

// Add both icons (hidden by default)
copyLinkButton.innerHTML = `
    <span class="link-icon">🔗</span>
    <span class="check-icon" style="display:none">✓</span>
`;

copyLinkButton.addEventListener('click', () => {
    const messageUrl = `${urlWithoutHash}#${messageId} \n`; // ← Space added here
    navigator.clipboard.writeText(messageUrl).then(() => {
        // Toggle visibility
        copyLinkButton.querySelector('.link-icon').style.display = 'none';
        copyLinkButton.querySelector('.check-icon').style.display = 'inline';
        
        // Revert after 2 seconds
        setTimeout(() => {
            copyLinkButton.querySelector('.link-icon').style.display = 'inline';
            copyLinkButton.querySelector('.check-icon').style.display = 'none';
        }, 2000);
    });
});
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'share-options';
    optionsContainer.appendChild(downloadButton);
    optionsContainer.appendChild(twitterButton);
    optionsContainer.appendChild(copyLinkButton);

    chatWrapper.appendChild(optionsContainer);

    // Close options when clicking outside
    setTimeout(() => {
        const clickHandler = (e) => {
            if (!chatWrapper.contains(e.target) && e.target !== shareButton) {
                chatWrapper.removeChild(optionsContainer);
                shareButton.style.display = 'block';
                document.removeEventListener('click', clickHandler);
            }
        };
        document.addEventListener('click', clickHandler);
    }, 0);
}
    
// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    handleHashRouting();
});



