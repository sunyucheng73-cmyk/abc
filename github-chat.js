(function injectGithubChat() {
  if (window.location.hostname !== "github.com") return;
  if (document.getElementById("github-chat-root")) return;

  const STORAGE_KEY = "github-chat-messages";
  const root = document.createElement("div");
  root.id = "github-chat-root";

  const toggle = document.createElement("button");
  toggle.className = "github-chat-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "github-chat-panel");
  toggle.innerHTML = '<span aria-hidden="true">Chat</span>';

  const panel = document.createElement("section");
  panel.id = "github-chat-panel";
  panel.className = "github-chat-panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "GitHub Chat");
  panel.innerHTML = `
    <header class="github-chat-header">
      <div>
        <div class="github-chat-title">GitHub Chat</div>
        <div class="github-chat-context"></div>
      </div>
      <button class="github-chat-close" type="button" aria-label="Close GitHub Chat">&times;</button>
    </header>
    <div class="github-chat-messages" role="log" aria-live="polite"></div>
    <form class="github-chat-form">
      <input class="github-chat-input" type="text" placeholder="Write a note about this page..." autocomplete="off" />
      <button class="github-chat-send" type="submit">Send</button>
    </form>
  `;

  root.appendChild(panel);
  root.appendChild(toggle);
  document.documentElement.appendChild(root);

  const messagesEl = panel.querySelector(".github-chat-messages");
  const inputEl = panel.querySelector(".github-chat-input");
  const contextEl = panel.querySelector(".github-chat-context");
  const closeEl = panel.querySelector(".github-chat-close");
  const formEl = panel.querySelector(".github-chat-form");

  function getPageContext() {
    const repoName = document.querySelector('strong[itemprop="name"] a')?.textContent?.trim();
    const ownerName = document.querySelector('[itemprop="author"] a')?.textContent?.trim();
    const issueTitle = document.querySelector("bdi.js-issue-title")?.textContent?.trim();
    const fallbackTitle = document.querySelector(".js-issue-title")?.textContent?.trim();
    const pathParts = window.location.pathname.split("/").filter(Boolean);

    if (ownerName && repoName && (issueTitle || fallbackTitle)) {
      return `${ownerName}/${repoName}: ${issueTitle || fallbackTitle}`;
    }

    if (ownerName && repoName) {
      return `${ownerName}/${repoName}`;
    }

    if (pathParts.length) {
      return pathParts.slice(0, 2).join("/");
    }

    return "github.com";
  }

  function createMessageElement(message) {
    const messageEl = document.createElement("div");
    messageEl.className = `github-chat-message github-chat-${message.author}`;
    messageEl.textContent = message.text;
    return messageEl;
  }

  function readMessages(callback) {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      callback(Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : []);
    });
  }

  function writeMessages(messages) {
    chrome.storage.local.set({ [STORAGE_KEY]: messages.slice(-50) });
  }

  function renderMessages(messages) {
    messagesEl.innerHTML = "";
    messages.forEach((message) => messagesEl.appendChild(createMessageElement(message)));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(author, text) {
    readMessages((messages) => {
      const nextMessages = messages.concat({
        author,
        text,
        url: window.location.href,
        createdAt: new Date().toISOString(),
      });
      writeMessages(nextMessages);
      renderMessages(nextMessages);
    });
  }

  function openPanel() {
    contextEl.textContent = getPageContext();
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    readMessages((messages) => {
      if (!messages.length) {
        const welcome = [{
          author: "bot",
          text: `Chat is ready for ${getPageContext()}. Use it to keep notes while browsing GitHub pages.`,
          url: window.location.href,
          createdAt: new Date().toISOString(),
        }];
        writeMessages(welcome);
        renderMessages(welcome);
        return;
      }
      renderMessages(messages);
    });
    inputEl.focus();
  }

  function closePanel() {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  }

  toggle.addEventListener("click", () => {
    if (panel.hidden) openPanel();
    else closePanel();
  });

  closeEl.addEventListener("click", closePanel);

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = "";
    addMessage("user", text);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      closePanel();
    }
  });
})();
