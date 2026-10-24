(function () {
    var PROJECTS = [
        {
            id: 'snippets',
            icon: '{S}',
            name: 'Snippets',
            blurb: 'Snippet everything you know.',
            description: 'One knowledge base that both you and your models read from. Every snippet carries its source, its citation and its tags, so a claim can be traced back to the page it came from — and any AI client that speaks MCP reads those same snippets over a connection you authorise, picking up exactly the tags you point it at instead of being re-briefed in every new chat. Organise by tag rather than by folder, publish long-form posts composed from the snippets they cite, and keep everything else private.',
            shot: 'screenshots/snippets.webp',
            url: 'https://snippets.eu',
            openLabel: 'Open Snippets',
            about: '/snippets/'
        },
        {
            id: 'tasks',
            icon: '{T}',
            name: 'Tasks',
            blurb: 'Tasks everything you do.',
            description: 'A to-do list that lives in your knowledge base instead of beside it. A task is a snippet with a tag: the date is a tag, done is a tag, and the steps are the bullet points in the body — so the web app, the terminal and an AI client all handle one without being taught a new object. Set yourself a reminder, or hand the task to an agent: it reads the request, loads the snippets your tags point at, does the work and writes the result back into the task. Same library, same tags, same interface as Snippets.',
            url: 'https://snippets.eu/app/tasks',
            openLabel: 'Open Tasks',
            about: '/tasks/'
        },
        {
            id: 'branchess',
            icon: '{♗}',
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
            id: 'polyglot',
            icon: '{7}',
            name: 'Polyglot',
            blurb: 'Feel the grammar of seven languages, one puzzle at a time.',
            description: 'Drag scrambled, colour-coded word tiles into the correct order for English, Danish, German, Spanish, French, Polish, or Japanese — and watch where each language parks its verb, adverb, or negation. Grammar puzzles across 8 lessons plus a vocabulary mode, each solve revealing the underlying structural rule and a literal gloss.',
            shot: 'screenshots/polyglot.webp',
            url: 'https://polyglot.bang-labs.eu'
        },
        {
            id: 'glyphclock',
            icon: '{G}',
            name: 'GlyphClock',
            blurb: 'A slower rhythm for the day.',
            description: 'The day is divided into 16 blocks of 90 minutes, each shown as a unique emoji glyph — one, two, or three copies mark the 30-minute phase within it. The time is the same everywhere in the world, but what each glyph means becomes personal. Set a focus text that stays visible beneath the clock.',
            shot: 'screenshots/glyphclock.webp',
            url: 'https://glyphclock.bang-labs.eu'
        },
        {
            id: 'planners',
            icon: '{✎}',
            name: 'Planners',
            blurb: 'Print the day you plan.',
            description: 'Paper day planners laid out in GlyphClock blocks instead of clock hours — for one person, for two with a shared column, or folded into a pocket-sized booklet — with every glyph placed for your own time zone. Plus a four-month calendar with Danish holidays, sky events, your own dates and any calendar you export as .ics. Everything is drawn in your browser; nothing you enter leaves it.',
            shot: 'screenshots/planners.webp',
            url: '/planners/',
            openLabel: 'Open Planners'
        }
    ];

    // The modal reuses one <img>, so swapping .src mid-session would keep
    // showing the previous project's picture until the new one finishes
    // loading. Preloading every screenshot up front (they're tiny webp
    // files) means the browser cache always has them ready, so the swap
    // is instant with no stale-image flash.
    PROJECTS.forEach(function (project) {
        if (!project.shot) return;
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
    var modalAbout = document.getElementById('project-modal-about');
    var lastFocused = null;

    function openModal(project) {
        lastFocused = document.activeElement;
        modalIcon.textContent = project.icon;
        modalName.textContent = project.name;

        // Not every project has a screenshot (Tasks is a view inside the
        // Snippets app, not a site of its own). Hiding the one shared <img>
        // is not enough on its own: leaving a stale .src on it means the
        // *previous* project's picture is what gets un-hidden next time.
        if (project.shot) {
            modalShot.src = project.shot;
            modalShot.alt = project.name + ' screenshot';
            modalShot.hidden = false;
        } else {
            modalShot.hidden = true;
            modalShot.removeAttribute('src');
            modalShot.alt = '';
        }

        modalDesc.textContent = project.description;
        modalLink.href = project.url;
        modalLink.textContent = (project.openLabel || 'Visit ' + project.name) + ' →';

        // The informational modal comes first; `about` is the longer read.
        if (project.about) {
            modalAbout.href = project.about;
            modalAbout.textContent = 'What ' + project.name + ' is →';
            modalAbout.hidden = false;
        } else {
            modalAbout.hidden = true;
        }

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
