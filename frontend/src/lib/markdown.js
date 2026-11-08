export function renderMarkdownLite(markdown) {
  const lines = markdown.split("\n");
  let html = "";
  let listOpen = null;

  const closeList = () => {
    if (listOpen) {
      html += `</${listOpen}>`;
      listOpen = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      continue;
    }

    if (line.startsWith("## ")) {
      closeList();
      html += `<h2>${inline(line.slice(3))}</h2>`;
      continue;
    }

    if (line.startsWith("> ")) {
      closeList();
      html += `<blockquote>${inline(line.slice(2))}</blockquote>`;
      continue;
    }

    const checkboxMatch = line.match(/^-\s\[( |x)\]\s(.*)$/i);
    if (checkboxMatch) {
      if (listOpen !== "ul") {
        closeList();
        html += "<ul>";
        listOpen = "ul";
      }
      const checked = checkboxMatch[1].toLowerCase() === "x";
      html += `<li><input type="checkbox" disabled${checked ? " checked" : ""}> ${inline(checkboxMatch[2])}</li>`;
      continue;
    }

    if (line.startsWith("- ")) {
      if (listOpen !== "ul") {
        closeList();
        html += "<ul>";
        listOpen = "ul";
      }
      html += `<li>${inline(line.slice(2))}</li>`;
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s(.*)$/);
    if (orderedMatch) {
      if (listOpen !== "ol") {
        closeList();
        html += "<ol>";
        listOpen = "ol";
      }
      html += `<li>${inline(orderedMatch[1])}</li>`;
      continue;
    }

    closeList();
    html += `<p>${inline(line)}</p>`;
  }

  closeList();
  return html;
}

function inline(text) {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}