(function () {
  const library = window.MMSKILLS_LIBRARY || {
    stats: {},
    domains: [],
    skills: [],
  };

  const state = {
    scope: "all",
    query: "",
    sort: "complete",
    view: "list",
  };

  const elements = {
    allSkillCount: document.getElementById("allSkillCount"),
    platformTree: document.getElementById("platformTree"),
    runtimeCardCount: document.getElementById("runtimeCardCount"),
    imageReferenceCount: document.getElementById("imageReferenceCount"),
    summarySkillCount: document.getElementById("summarySkillCount"),
    summaryDomainCount: document.getElementById("summaryDomainCount"),
    skillSearch: document.getElementById("skillSearch"),
    skillSort: document.getElementById("skillSort"),
    activeDomainLabel: document.getElementById("activeDomainLabel"),
    visibleSkillCount: document.getElementById("visibleSkillCount"),
    skillGrid: document.getElementById("skillGrid"),
    emptyState: document.getElementById("emptyState"),
    dialog: document.getElementById("skillDialog"),
    dialogContent: document.getElementById("skillDialogContent"),
    imageLightbox: document.getElementById("imageLightbox"),
    lightboxImage: document.getElementById("lightboxImage"),
    lightboxTitle: document.getElementById("lightboxTitle"),
    lightboxPath: document.getElementById("lightboxPath"),
  };

  library.skills = (library.skills || []).map((skill) => ({
    platformId: "ubuntu",
    platform: "Ubuntu",
    category: "GUI Tasks",
    ...skill,
  }));

  const byId = new Map(library.skills.map((skill) => [skill.id, skill]));
  const domains = [...(library.domains || [])];
  const platforms =
    library.platforms && library.platforms.length
      ? [...library.platforms]
      : [
          {
            id: "ubuntu",
            label: "Ubuntu",
            count: library.stats.skillCount,
            domainIds: domains.map((domain) => domain.id),
          },
        ];

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function inlineMarkdown(value) {
    return escapeHtml(value).replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-US");
  }

  function setText(element, value) {
    if (element) {
      element.textContent = value;
    }
  }

  function renderSummary() {
    setText(elements.allSkillCount, formatNumber(library.stats.skillCount));
    setText(elements.runtimeCardCount, formatNumber(library.stats.runtimeCardCount));
    setText(elements.imageReferenceCount, formatNumber(library.stats.imageCount));
    setText(elements.summarySkillCount, formatNumber(library.stats.skillCount));
    setText(elements.summaryDomainCount, formatNumber(library.stats.domainCount));
  }

  function renderPlatformTree() {
    elements.platformTree.innerHTML = platforms
      .map(
        (platform) => {
          const childDomains = domains.filter((domain) => domain.platformId === platform.id);
          return `
            <div class="platform-group">
              <button class="tree-row platform" type="button" data-scope="platform:${escapeHtml(platform.id)}">
                <span>${escapeHtml(platform.label)}</span>
                <strong>${formatNumber(platform.count)}</strong>
              </button>
              <div class="domain-tree">
                ${childDomains
                  .map(
                    (domain) => `
                      <button class="tree-row" type="button" data-scope="domain:${escapeHtml(domain.id)}">
                        <span>${escapeHtml(domain.label)}</span>
                        <strong>${formatNumber(domain.count)}</strong>
                      </button>
                    `
                  )
                  .join("")}
              </div>
            </div>
          `;
        }
      )
      .join("");
  }

  function matchesScope(skill) {
    if (state.scope === "all") {
      return true;
    }
    const [kind, value] = state.scope.split(":");
    if (kind === "platform") {
      return skill.platformId === value;
    }
    if (kind === "domain") {
      return skill.domain === value;
    }
    return true;
  }

  function searchableText(skill) {
    return [
      skill.name,
      skill.description,
      skill.domainLabel,
      skill.sourcePath,
      skill.skillMarkdown,
      ...(skill.tags || []),
    ]
      .join(" ")
      .toLowerCase();
  }

  function visibleSkills() {
    const query = state.query.trim().toLowerCase();
    let skills = library.skills.filter((skill) => {
      const domainMatch = matchesScope(skill);
      const queryMatch = !query || searchableText(skill).includes(query);
      return domainMatch && queryMatch;
    });

    skills = skills.sort((a, b) => {
      if (state.sort === "name") {
        return a.name.localeCompare(b.name);
      }
      if (state.sort === "visual") {
        return b.imageCount - a.imageCount || a.name.localeCompare(b.name);
      }
      if (state.sort === "runtime") {
        return b.runtimeCardCount - a.runtimeCardCount || a.name.localeCompare(b.name);
      }
      return b.completenessScore - a.completenessScore || a.name.localeCompare(b.name);
    });

    return skills;
  }

  function renderTags(skill) {
    return (skill.tags || [])
      .slice(0, 4)
      .map((tag) => `<span>${escapeHtml(tag)}</span>`)
      .join("");
  }

  function cardHtml(skill) {
    return `
      <article class="skill-card">
        <div class="skill-body">
          <div class="skill-domain">
            <span>${escapeHtml(skill.domainLabel)}</span>
            <span>${escapeHtml(skill.platform)}</span>
          </div>
          <h2>${escapeHtml(skill.name)}</h2>
          <p>${escapeHtml(skill.description)}</p>
          <div class="skill-meta" aria-label="Skill package metadata">
            <div>
              <strong>${formatNumber(skill.runtimeCardCount)}</strong>
              <span>Runtime states</span>
            </div>
            <div>
              <strong>${formatNumber(skill.imageCount)}</strong>
              <span>Images</span>
            </div>
          </div>
          <div class="skill-tags">${renderTags(skill)}</div>
          <div class="skill-actions">
            <button type="button" data-open-skill="${escapeHtml(skill.id)}">Open skill</button>
            <button type="button" data-copy-path="${escapeHtml(skill.id)}">Copy path</button>
          </div>
        </div>
      </article>
    `;
  }

  function updateActiveButtons() {
    document.querySelectorAll("[data-scope]").forEach((button) => {
      button.classList.toggle("active", button.dataset.scope === state.scope);
    });
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === state.view);
    });
  }

  function updateFilterLabel(count) {
    const [kind, value] = state.scope.split(":");
    const domain = kind === "domain" ? domains.find((item) => item.id === value) : null;
    const platform = kind === "platform" ? platforms.find((item) => item.id === value) : null;
    setText(elements.activeDomainLabel, domain ? domain.label : platform ? platform.label : "All skill domains");
    setText(elements.visibleSkillCount, `${formatNumber(count)} skills`);
  }

  function renderSkills() {
    const skills = visibleSkills();
    elements.skillGrid.classList.toggle("is-list", state.view === "list");
    elements.skillGrid.innerHTML = skills.map(cardHtml).join("");
    elements.emptyState.hidden = skills.length > 0;
    updateFilterLabel(skills.length);
    updateActiveButtons();
  }

  function listHtml(items) {
    if (!items || !items.length) {
      return "<p>No extracted notes for this field.</p>";
    }
    return `<ul>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`;
  }

  function markdownToHtml(markdown) {
    const lines = String(markdown || "").split(/\r?\n/);
    const html = [];
    let paragraph = [];
    let list = [];
    let code = [];
    let inCode = false;

    function flushParagraph() {
      if (paragraph.length) {
        html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
        paragraph = [];
      }
    }

    function flushList() {
      if (list.length) {
        html.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
        list = [];
      }
    }

    function flushCode() {
      if (code.length) {
        html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = [];
      }
    }

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("```")) {
        if (inCode) {
          flushCode();
          inCode = false;
        } else {
          flushParagraph();
          flushList();
          inCode = true;
        }
        return;
      }
      if (inCode) {
        code.push(line);
        return;
      }
      if (!trimmed) {
        flushParagraph();
        flushList();
        return;
      }
      const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        flushList();
        const level = Math.min(heading[1].length + 2, 5);
        html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
        return;
      }
      const bullet = trimmed.match(/^[-*]\s+(.+)$/);
      if (bullet) {
        flushParagraph();
        list.push(bullet[1]);
        return;
      }
      paragraph.push(trimmed);
    });

    flushParagraph();
    flushList();
    flushCode();
    return html.join("");
  }

  function renderViewChips(views) {
    if (!views || !views.length) {
      return "";
    }
    return `
      <div class="runtime-views">
        ${views
          .map(
            (view) => `
              <span>
                <strong>${escapeHtml(view.viewType || "view")}</strong>
                ${escapeHtml(view.imagePath || "")}
              </span>
            `
          )
          .join("")}
      </div>
    `;
  }

  function imageSource(image) {
    return image.fullPath || image.originalPath || image.previewPath || "";
  }

  function thumbnailSource(image) {
    return image.previewPath || imageSource(image);
  }

  function renderRuntimeStates(skill) {
    if (!skill.runtimeStates || !skill.runtimeStates.length) {
      return '<p class="detail-muted">No runtime states were extracted for this skill.</p>';
    }

    return skill.runtimeStates
      .map(
        (runtimeState, index) => `
          <details class="runtime-card" ${index < 2 ? "open" : ""}>
            <summary>
              <span>${escapeHtml(runtimeState.stateName || runtimeState.stateId)}</span>
              <em>${escapeHtml(runtimeState.stage || "state")}</em>
            </summary>
            <div class="runtime-card-body">
              <p><strong>When to use:</strong> ${inlineMarkdown(runtimeState.whenToUse)}</p>
              <p><strong>When not to use:</strong> ${inlineMarkdown(runtimeState.whenNotToUse)}</p>
              <div>
                <strong>Visible cues</strong>
                ${listHtml(runtimeState.visibleCues)}
              </div>
              ${
                runtimeState.verificationCue
                  ? `<p><strong>Verification:</strong> ${inlineMarkdown(runtimeState.verificationCue)}</p>`
                  : ""
              }
              ${renderViewChips(runtimeState.availableViews)}
            </div>
          </details>
        `
      )
      .join("");
  }

  function renderImageGallery(skill) {
    if (!skill.imageReferences || !skill.imageReferences.length) {
      return '<p class="detail-muted">No image references are listed for this skill.</p>';
    }

    return `
      <div class="image-reference-grid">
        ${skill.imageReferences
          .map(
            (image) => {
              const source = imageSource(image);
              const thumbnail = thumbnailSource(image);
              return `
              <button
                class="image-reference-card"
                type="button"
                data-lightbox-src="${escapeHtml(source)}"
                data-lightbox-title="${escapeHtml(image.label)}"
                data-lightbox-path="${escapeHtml(image.imagePath)}"
                ${source ? "" : "disabled"}
              >
                ${
                  thumbnail
                    ? `<img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(image.label)}" loading="lazy" />`
                    : '<div class="image-missing">No preview</div>'
                }
                <span class="image-reference-type">${escapeHtml(image.viewType)}</span>
                <strong>${escapeHtml(image.label)}</strong>
                <small>${escapeHtml(image.imagePath)}</small>
              </button>
            `;
            }
          )
          .join("")}
      </div>
    `;
  }

  function openImageLightbox(button) {
    const source = button.dataset.lightboxSrc;
    if (!source || !elements.imageLightbox) {
      return;
    }
    elements.lightboxImage.src = source;
    elements.lightboxImage.alt = button.dataset.lightboxTitle || "Skill reference image";
    setText(elements.lightboxTitle, button.dataset.lightboxTitle || "Skill reference image");
    setText(elements.lightboxPath, button.dataset.lightboxPath || source);
    elements.imageLightbox.hidden = false;
    elements.imageLightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
    const closeButton = elements.imageLightbox.querySelector(".lightbox-toolbar button");
    if (closeButton) {
      closeButton.focus({ preventScroll: true });
    }
  }

  function closeImageLightbox() {
    if (!elements.imageLightbox || elements.imageLightbox.hidden) {
      return;
    }
    elements.imageLightbox.hidden = true;
    elements.imageLightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");
    elements.lightboxImage.removeAttribute("src");
  }

  function openSkill(skillId) {
    const skill = byId.get(skillId);
    if (!skill) {
      return;
    }

    elements.dialogContent.innerHTML = `
      <div class="detail-header">
        <p class="library-kicker">${escapeHtml(skill.domainLabel)} / ${escapeHtml(skill.platform)}</p>
        <h2>${escapeHtml(skill.name)}</h2>
        <p>${escapeHtml(skill.description)}</p>
        <div class="dialog-path">${escapeHtml(skill.sourcePath)}</div>
        <div class="dialog-stats">
          <div>
            <strong>${formatNumber(skill.runtimeCardCount)}</strong>
            <span>Runtime states</span>
          </div>
          <div>
            <strong>${formatNumber(skill.imageCount)}</strong>
            <span>Images</span>
          </div>
        </div>
      </div>

      <div class="detail-grid">
        <section class="detail-panel skill-markdown-panel">
          <div class="detail-panel-title">
            <h3>SKILL.md</h3>
            <span>Procedure and applicability</span>
          </div>
          <div class="markdown-body">${markdownToHtml(skill.skillMarkdown)}</div>
        </section>

        <section class="detail-panel runtime-panel">
          <div class="detail-panel-title">
            <h3>runtime_state_cards.json</h3>
            <span>Compact inference states for branch-time skill loading</span>
          </div>
          ${renderRuntimeStates(skill)}
        </section>

        <section class="detail-panel images-panel">
          <div class="detail-panel-title">
            <h3>Images/</h3>
            <span>Ordered visual references</span>
          </div>
          ${renderImageGallery(skill)}
        </section>
      </div>
    `;

    if (typeof elements.dialog.showModal === "function") {
      elements.dialog.showModal();
    } else {
      elements.dialog.setAttribute("open", "open");
    }
  }

  function copySkillPath(skillId, button) {
    const skill = byId.get(skillId);
    if (!skill) {
      return;
    }
    const write =
      navigator.clipboard && navigator.clipboard.writeText
        ? navigator.clipboard.writeText(skill.sourcePath)
        : Promise.reject(new Error("Clipboard unavailable"));
    write
      .then(() => {
        const previous = button.textContent;
        button.textContent = "Copied";
        window.setTimeout(() => {
          button.textContent = previous;
        }, 1200);
      })
      .catch(() => {
        button.textContent = skill.sourcePath;
      });
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const scopeButton = event.target.closest("[data-scope]");
      if (scopeButton) {
        state.scope = scopeButton.dataset.scope || "all";
        renderSkills();
        return;
      }

      const viewButton = event.target.closest("[data-view]");
      if (viewButton) {
        state.view = viewButton.dataset.view || "grid";
        renderSkills();
        return;
      }

      const openButton = event.target.closest("[data-open-skill]");
      if (openButton) {
        openSkill(openButton.dataset.openSkill);
        return;
      }

      const copyButton = event.target.closest("[data-copy-path]");
      if (copyButton) {
        copySkillPath(copyButton.dataset.copyPath, copyButton);
        return;
      }

      const imageButton = event.target.closest("[data-lightbox-src]");
      if (imageButton) {
        openImageLightbox(imageButton);
        return;
      }

      const lightboxClose = event.target.closest("[data-close-lightbox]");
      if (lightboxClose || event.target === elements.imageLightbox) {
        closeImageLightbox();
      }
    });

    elements.skillSearch.addEventListener("input", (event) => {
      state.query = event.target.value;
      renderSkills();
    });

    elements.skillSort.addEventListener("change", (event) => {
      state.sort = event.target.value;
      renderSkills();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && elements.imageLightbox && !elements.imageLightbox.hidden) {
        event.preventDefault();
        closeImageLightbox();
      }
    });

    elements.dialog.addEventListener("cancel", (event) => {
      if (elements.imageLightbox && !elements.imageLightbox.hidden) {
        event.preventDefault();
        closeImageLightbox();
      }
    });

  }

  renderSummary();
  renderPlatformTree();
  bindEvents();
  renderSkills();
})();
