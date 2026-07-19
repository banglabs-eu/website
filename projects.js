(function () {
    var PROJECTS = [
        {
            id: 'basen',
            icon: '\u{1F3AC}',
            name: 'Basen',
            blurb: 'Self-hosted AI image & video studio.',
            description: 'A self-hosted AI media studio you run on any always-on machine — a Raspberry Pi works fine — driving a rent-by-the-minute GPU server that does the actual generation. Image generation across multiple models side by side, image-to-video, chat with a local LLM, and a gallery with ratings and albums. Stop the GPU between sessions and you only pay for storage.',
            shot: 'screenshots/basen.webp',
            url: 'https://basen.bang-labs.eu'
        },
        {
            id: 'snippets',
            icon: '{S}',
            name: 'Snippets',
            blurb: 'Note-taking for people who care where their knowledge comes from.',
            description: 'Capture notes with sources, citations, and tags — every note can be traced back to where it came from. Sign in once and take notes anywhere: web app or CLI, with invite-gated registration, Google sign-in, or a passwordless magic link. Browse what others have chosen to publish in the public knowledge base.',
            shot: 'screenshots/snippets.webp',
            url: 'https://snippets.eu'
        },
        {
            id: 'branchess',
            icon: '♗',
            name: 'Branchess',
            blurb: 'Chess study tool with a branching game tree.',
            description: 'Explore opening variations, annotate moves, and analyze positions with Stockfish 18 running at full strength in your browser. 171 built-in openings with master-game statistics, Syzygy endgame tablebases, and Lichess game/study import — free, and it runs entirely client-side.',
            shot: 'screenshots/branchess.webp',
            url: 'https://branchess.bang-labs.eu'
        },
        {
            id: 'finance',
            icon: '{€}',
            name: 'Finance',
            blurb: 'A Vink-style value-creation analysis walkthrough.',
            description: 'Type in any company’s income statement and balance sheet and every metric — ROIC, EVA, free cash flow, DuPont, debt ratios — recomputes live as you go. Four steps: collect data, see trends, judge performance and health, and arrive at a football-field valuation with a buy/hold/avoid verdict.',
            shot: 'screenshots/finance.webp',
            url: 'https://finance.bang-labs.eu'
        },
        {
            id: 'presence',
            icon: '{P}',
            name: 'Presence',
            blurb: 'Know what to do, right now, right here.',
            description: 'A context-aware activity recommender: senses the time, place, and day type; scores candidates by priority, habit, and energy; and recommends what’s next — with reasons you can actually see, not a black box.',
            shot: 'screenshots/presence.webp',
            url: 'https://presence.bang-labs.eu'
        },
        {
            id: 'glyphclock',
            icon: '\u{1F550}',
            name: 'GlyphClock',
            blurb: 'A slower rhythm for the day.',
            description: 'The day is divided into 16 blocks of 90 minutes, each shown as a unique emoji glyph — one, two, or three copies mark the 30-minute phase within it. The time is the same everywhere in the world, but what each glyph means becomes personal. Set a focus text that stays visible beneath the clock.',
            shot: 'screenshots/glyphclock.webp',
            url: 'https://glyphclock.bang-labs.eu'
        }
    ];

    // The modal reuses one <img>, so swapping .src mid-session would keep
    // showing the previous project's picture until the new one finishes
    // loading. Preloading every screenshot up front (they're tiny webp
    // files) means the browser cache always has them ready, so the swap
    // is instant with no stale-image flash.
    PROJECTS.forEach(function (project) {
        var preload = new Image();
        preload.src = project.shot;
    });

    var grid = document.getElementById('project-links');
    var modal = document.getElementById('project-modal');
    var modalIcon = document.getElementById('project-modal-icon');
    var modalName = document.getElementById('project-modal-name');
    var modalShot = document.getElementById('project-modal-shot');
    var modalDesc = document.getElementById('project-modal-desc');
    var modalLink = document.getElementById('project-modal-link');
    var lastFocused = null;

    function openModal(project) {
        lastFocused = document.activeElement;
        modalIcon.textContent = project.icon;
        modalName.textContent = project.name;
        modalShot.src = project.shot;
        modalShot.alt = project.name + ' screenshot';
        modalDesc.textContent = project.description;
        modalLink.href = project.url;
        modalLink.textContent = 'Visit ' + project.name + ' →';
        modal.hidden = false;
        modal.querySelector('.project-modal__close').focus();
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.hidden = true;
        document.body.style.overflow = '';
        if (lastFocused) lastFocused.focus();
    }

    PROJECTS.forEach(function (project) {
        var pill = document.createElement('button');
        pill.type = 'button';
        pill.innerHTML =
            '<span class="project-pill__icon">' + project.icon + '</span>' +
            '<span>' + project.name + '</span>';
        pill.addEventListener('click', function () { openModal(project); });
        grid.appendChild(pill);
    });

    modal.addEventListener('click', function (e) {
        if (e.target.hasAttribute('data-close')) closeModal();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !modal.hidden) closeModal();
    });
})();
