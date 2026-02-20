(function () {
    'use strict';

    var LANGS = [
        ['bg', 'Български'], ['hr', 'Hrvatski'], ['cs', 'Čeština'],
        ['da', 'Dansk'], ['nl', 'Nederlands'], ['en', 'English'],
        ['et', 'Eesti'], ['fi', 'Suomi'], ['fr', 'Français'],
        ['de', 'Deutsch'], ['el', 'Ελληνικά'], ['hu', 'Magyar'],
        ['ga', 'Gaeilge'], ['it', 'Italiano'], ['lv', 'Latviešu'],
        ['lt', 'Lietuvių'], ['mt', 'Malti'], ['pl', 'Polski'],
        ['pt', 'Português'], ['ro', 'Română'], ['sk', 'Slovenčina'],
        ['sl', 'Slovenščina'], ['es', 'Español'], ['sv', 'Svenska']
    ];

    var VALID = {};
    for (var k = 0; k < LANGS.length; k++) VALID[LANGS[k][0]] = true;

    var LOCALES = {
        bg: 'bg_BG', hr: 'hr_HR', cs: 'cs_CZ', da: 'da_DK', nl: 'nl_NL',
        en: 'en_US', et: 'et_EE', fi: 'fi_FI', fr: 'fr_FR', de: 'de_DE',
        el: 'el_GR', hu: 'hu_HU', ga: 'ga_IE', it: 'it_IT', lv: 'lv_LV',
        lt: 'lt_LT', mt: 'mt_MT', pl: 'pl_PL', pt: 'pt_PT', ro: 'ro_RO',
        sk: 'sk_SK', sl: 'sl_SI', es: 'es_ES', sv: 'sv_SE'
    };

    var T = {
        'tagline.line1': {
            en: 'Open source projects.',
            bg: 'Проекти с отворен код.',
            hr: 'Projekti otvorenog koda.',
            cs: 'Open source projekty.',
            da: 'Open source-projekter.',
            nl: 'Opensourceprojecten.',
            et: 'Avatud lähtekoodiga projektid.',
            fi: 'Avoimen lähdekoodin projekteja.',
            fr: 'Projets open source.',
            de: 'Open-Source-Projekte.',
            el: 'Έργα ανοιχτού κώδικα.',
            hu: 'Nyílt forráskódú projektek.',
            ga: 'Tionscadail foinse oscailte.',
            it: 'Progetti open source.',
            lv: 'Atvērtā pirmkoda projekti.',
            lt: 'Atvirojo kodo projektai.',
            mt: 'Proġetti open source.',
            pl: 'Projekty open source.',
            pt: 'Projetos de código aberto.',
            ro: 'Proiecte open source.',
            sk: 'Open source projekty.',
            sl: 'Odprtokodni projekti.',
            es: 'Proyectos de código abierto.',
            sv: 'Öppen källkodsprojekt.'
        },
        'tagline.line2': {
            en: 'Built in public.',
            bg: 'Разработени публично.',
            hr: 'Izgrađeno javno.',
            cs: 'Vyvíjeno veřejně.',
            da: 'Bygget offentligt.',
            nl: 'Publiek gebouwd.',
            et: 'Ehitatud avalikult.',
            fi: 'Rakennettu julkisesti.',
            fr: 'Développés en public.',
            de: 'Öffentlich entwickelt.',
            el: 'Χτισμένα δημόσια.',
            hu: 'Nyilvánosan fejlesztve.',
            ga: 'Tógtha go poiblí.',
            it: 'Sviluppati in pubblico.',
            lv: 'Veidoti publiski.',
            lt: 'Kuriami viešai.',
            mt: 'Mibnija fil-pubbliku.',
            pl: 'Tworzone publicznie.',
            pt: 'Desenvolvidos em público.',
            ro: 'Dezvoltate public.',
            sk: 'Vyvíjané verejne.',
            sl: 'Zgrajeno javno.',
            es: 'Desarrollados en público.',
            sv: 'Byggt offentligt.'
        },
        'tagline.line3': {
            en: 'Contributions welcome.',
            bg: 'Приносът е добре дошъл.',
            hr: 'Doprinosi su dobrodošli.',
            cs: 'Příspěvky vítány.',
            da: 'Bidrag er velkomne.',
            nl: 'Bijdragen welkom.',
            et: 'Panused on teretulnud.',
            fi: 'Osallistuminen tervetullutta.',
            fr: 'Contributions bienvenues.',
            de: 'Beiträge willkommen.',
            el: 'Συνεισφορές ευπρόσδεκτες.',
            hu: 'Közreműködés szívesen látott.',
            ga: 'Fáilte roimh ranníocaíochtaí.',
            it: 'Contributi benvenuti.',
            lv: 'Ieguldījumi laipni gaidīti.',
            lt: 'Prisidėjimai laukiami.',
            mt: 'Kontribuzzjonijiet milqugħa.',
            pl: 'Wkład mile widziany.',
            pt: 'Contribuições são bem-vindas.',
            ro: 'Contribuțiile sunt binevenite.',
            sk: 'Príspevky vítané.',
            sl: 'Prispevki dobrodošli.',
            es: 'Contribuciones bienvenidas.',
            sv: 'Bidrag välkomna.'
        },
        'error.heading': {
            en: "This page doesn't exist",
            bg: 'Тази страница не съществува',
            hr: 'Ova stranica ne postoji',
            cs: 'Tato stránka neexistuje',
            da: 'Denne side findes ikke',
            nl: 'Deze pagina bestaat niet',
            et: 'Seda lehte ei ole olemas',
            fi: 'Tätä sivua ei ole olemassa',
            fr: "Cette page n'existe pas",
            de: 'Diese Seite existiert nicht',
            el: 'Αυτή η σελίδα δεν υπάρχει',
            hu: 'Ez az oldal nem létezik',
            ga: 'Níl an leathanach seo ann',
            it: 'Questa pagina non esiste',
            lv: 'Šī lapa neeksistē',
            lt: 'Šis puslapis neegzistuoja',
            mt: 'Din il-paġna ma teżistix',
            pl: 'Ta strona nie istnieje',
            pt: 'Esta página não existe',
            ro: 'Această pagină nu există',
            sk: 'Táto stránka neexistuje',
            sl: 'Ta stran ne obstaja',
            es: 'Esta página no existe',
            sv: 'Den här sidan finns inte'
        },
        'error.message': {
            en: 'Looks like something went bang in the wrong place.',
            bg: 'Изглежда нещо гръмна на грешното място.',
            hr: 'Čini se da je nešto puknulo na krivom mjestu.',
            cs: 'Vypadá to, že něco bouchlo na špatném místě.',
            da: 'Det ser ud til, at noget gik bang det forkerte sted.',
            nl: 'Het lijkt erop dat er iets op de verkeerde plek is ontploft.',
            et: 'Tundub, et midagi käis pauku valesse kohta.',
            fi: 'Näyttää siltä, että jokin pamahti väärään paikkaan.',
            fr: "On dirait que quelque chose a fait bang au mauvais endroit.",
            de: 'Sieht aus, als hätte es am falschen Ort geknallt.',
            el: 'Φαίνεται ότι κάτι έσκασε στο λάθος μέρος.',
            hu: 'Úgy tűnik, valami rossz helyen robbant.',
            ga: 'Is cosúil gur phléasc rud éigin san áit mhícheart.',
            it: 'Sembra che qualcosa sia esploso nel posto sbagliato.',
            lv: 'Izskatās, ka kaut kas uzsprāga nepareizajā vietā.',
            lt: 'Panašu, kad kažkas sprogo ne toje vietoje.',
            mt: "Jidher li xi ħaġa splodiet fil-post żbaljat.",
            pl: 'Wygląda na to, że coś wybuchło w złym miejscu.',
            pt: 'Parece que algo explodiu no lugar errado.',
            ro: 'Se pare că ceva a explodat în locul greșit.',
            sk: 'Vyzerá to, že niečo bouchlo na nesprávnom mieste.',
            sl: 'Zdi se, da je nekaj počilo na napačnem mestu.',
            es: 'Parece que algo explotó en el lugar equivocado.',
            sv: 'Det verkar som att något small på fel ställe.'
        },
        'error.back': {
            en: '\u2190 Back to Bang Labs',
            bg: '\u2190 Обратно към Bang Labs',
            hr: '\u2190 Natrag na Bang Labs',
            cs: '\u2190 Zpět na Bang Labs',
            da: '\u2190 Tilbage til Bang Labs',
            nl: '\u2190 Terug naar Bang Labs',
            et: '\u2190 Tagasi Bang Labsi juurde',
            fi: '\u2190 Takaisin Bang Labsiin',
            fr: '\u2190 Retour à Bang Labs',
            de: '\u2190 Zurück zu Bang Labs',
            el: '\u2190 Πίσω στο Bang Labs',
            hu: '\u2190 Vissza a Bang Labshoz',
            ga: '\u2190 Ar ais go Bang Labs',
            it: '\u2190 Torna a Bang Labs',
            lv: '\u2190 Atpakaļ uz Bang Labs',
            lt: '\u2190 Grįžti į Bang Labs',
            mt: '\u2190 Lura lejn Bang Labs',
            pl: '\u2190 Powrót do Bang Labs',
            pt: '\u2190 Voltar para Bang Labs',
            ro: '\u2190 Înapoi la Bang Labs',
            sk: '\u2190 Späť na Bang Labs',
            sl: '\u2190 Nazaj na Bang Labs',
            es: '\u2190 Volver a Bang Labs',
            sv: '\u2190 Tillbaka till Bang Labs'
        },
        'title.index': {
            en: 'Bang Labs \u2014 Open Source Tools',
            bg: 'Bang Labs \u2014 Инструменти с отворен код',
            hr: 'Bang Labs \u2014 Alati otvorenog koda',
            cs: 'Bang Labs \u2014 Open source nástroje',
            da: 'Bang Labs \u2014 Open source-værktøjer',
            nl: 'Bang Labs \u2014 Opensourcetools',
            et: 'Bang Labs \u2014 Avatud lähtekoodiga tööriistad',
            fi: 'Bang Labs \u2014 Avoimen lähdekoodin työkalut',
            fr: 'Bang Labs \u2014 Outils open source',
            de: 'Bang Labs \u2014 Open-Source-Werkzeuge',
            el: 'Bang Labs \u2014 Εργαλεία ανοιχτού κώδικα',
            hu: 'Bang Labs \u2014 Nyílt forráskódú eszközök',
            ga: 'Bang Labs \u2014 Uirlisí foinse oscailte',
            it: 'Bang Labs \u2014 Strumenti open source',
            lv: 'Bang Labs \u2014 Atvērtā pirmkoda rīki',
            lt: 'Bang Labs \u2014 Atvirojo kodo įrankiai',
            mt: 'Bang Labs \u2014 Għodod open source',
            pl: 'Bang Labs \u2014 Narzędzia open source',
            pt: 'Bang Labs \u2014 Ferramentas de código aberto',
            ro: 'Bang Labs \u2014 Instrumente open source',
            sk: 'Bang Labs \u2014 Open source nástroje',
            sl: 'Bang Labs \u2014 Odprtokodna orodja',
            es: 'Bang Labs \u2014 Herramientas de código abierto',
            sv: 'Bang Labs \u2014 Verktyg med öppen källkod'
        },
        'title.error': {
            en: 'Page Not Found \u2014 Bang Labs',
            bg: 'Страницата не е намерена \u2014 Bang Labs',
            hr: 'Stranica nije pronađena \u2014 Bang Labs',
            cs: 'Stránka nenalezena \u2014 Bang Labs',
            da: 'Siden blev ikke fundet \u2014 Bang Labs',
            nl: 'Pagina niet gevonden \u2014 Bang Labs',
            et: 'Lehte ei leitud \u2014 Bang Labs',
            fi: 'Sivua ei löytynyt \u2014 Bang Labs',
            fr: 'Page non trouvée \u2014 Bang Labs',
            de: 'Seite nicht gefunden \u2014 Bang Labs',
            el: 'Η σελίδα δεν βρέθηκε \u2014 Bang Labs',
            hu: 'Az oldal nem található \u2014 Bang Labs',
            ga: 'Leathanach gan aimsiú \u2014 Bang Labs',
            it: 'Pagina non trovata \u2014 Bang Labs',
            lv: 'Lapa nav atrasta \u2014 Bang Labs',
            lt: 'Puslapis nerastas \u2014 Bang Labs',
            mt: 'Il-paġna ma nstabitx \u2014 Bang Labs',
            pl: 'Strona nie znaleziona \u2014 Bang Labs',
            pt: 'Página não encontrada \u2014 Bang Labs',
            ro: 'Pagina nu a fost găsită \u2014 Bang Labs',
            sk: 'Stránka nenájdená \u2014 Bang Labs',
            sl: 'Stran ni najdena \u2014 Bang Labs',
            es: 'Página no encontrada \u2014 Bang Labs',
            sv: 'Sidan hittades inte \u2014 Bang Labs'
        },
        'meta.description': {
            en: 'Bang Labs builds open source software tools. We build, share, and encourage involvement in open source projects.',
            bg: 'Bang Labs създава софтуерни инструменти с отворен код. Ние създаваме, споделяме и насърчаваме участието в проекти с отворен код.',
            hr: 'Bang Labs izrađuje softverske alate otvorenog koda. Gradimo, dijelimo i potičemo sudjelovanje u projektima otvorenog koda.',
            cs: 'Bang Labs vytváří open source softwarové nástroje. Vytváříme, sdílíme a podporujeme zapojení do open source projektů.',
            da: 'Bang Labs bygger open source-softwareværktøjer. Vi bygger, deler og opmuntrer til deltagelse i open source-projekter.',
            nl: 'Bang Labs bouwt opensourcesoftwaretools. We bouwen, delen en moedigen betrokkenheid bij opensourceprojecten aan.',
            et: 'Bang Labs loob avatud lähtekoodiga tarkvaratööriistu. Me ehitame, jagame ja julgustame osalema avatud lähtekoodiga projektides.',
            fi: 'Bang Labs rakentaa avoimen lähdekoodin ohjelmistotyökaluja. Rakennamme, jaamme ja kannustamme osallistumaan avoimen lähdekoodin projekteihin.',
            fr: 'Bang Labs crée des outils logiciels open source. Nous construisons, partageons et encourageons la participation aux projets open source.',
            de: 'Bang Labs entwickelt Open-Source-Softwarewerkzeuge. Wir entwickeln, teilen und fördern die Beteiligung an Open-Source-Projekten.',
            el: 'Η Bang Labs δημιουργεί εργαλεία λογισμικού ανοιχτού κώδικα. Χτίζουμε, μοιραζόμαστε και ενθαρρύνουμε τη συμμετοχή σε έργα ανοιχτού κώδικα.',
            hu: 'A Bang Labs nyílt forráskódú szoftvereszközöket készít. Építünk, megosztunk és ösztönözzük a nyílt forráskódú projektekben való részvételt.',
            ga: 'Déanann Bang Labs uirlisí bogearraí foinse oscailte. Tógaimid, roinneimid agus spreagaimid rannpháirtíocht i dtionscadail foinse oscailte.',
            it: 'Bang Labs costruisce strumenti software open source. Costruiamo, condividiamo e incoraggiamo la partecipazione ai progetti open source.',
            lv: 'Bang Labs izveido atvērtā pirmkoda programmatūras rīkus. Mēs veidojam, dalāmies un mudinām iesaistīties atvērtā pirmkoda projektos.',
            lt: 'Bang Labs kuria atvirojo kodo programinės įrangos įrankius. Kuriame, dalijamės ir skatename dalyvavimą atvirojo kodo projektuose.',
            mt: "Bang Labs jibni għodod ta' software open source. Nibnu, naqsmu u ninkoraġġixxu l-involviment fi proġetti open source.",
            pl: 'Bang Labs tworzy narzędzia open source. Budujemy, dzielimy się i zachęcamy do udziału w projektach open source.',
            pt: 'Bang Labs constrói ferramentas de software de código aberto. Construímos, compartilhamos e incentivamos o envolvimento em projetos de código aberto.',
            ro: 'Bang Labs construiește instrumente software open source. Construim, împărtășim și încurajăm implicarea în proiecte open source.',
            sk: 'Bang Labs vytvára open source softvérové nástroje. Vytvárame, zdieľame a podporujeme zapojenie do open source projektov.',
            sl: 'Bang Labs gradi odprtokodna programska orodja. Gradimo, delimo in spodbujamo sodelovanje pri odprtokodnih projektih.',
            es: 'Bang Labs construye herramientas de software de código abierto. Construimos, compartimos y fomentamos la participación en proyectos de código abierto.',
            sv: 'Bang Labs bygger mjukvaruverktyg med öppen källkod. Vi bygger, delar och uppmuntrar engagemang i projekt med öppen källkod.'
        },
        'og.description': {
            en: 'Open source software tools. Building in the open, sharing ideas, and building tools.',
            bg: 'Софтуерни инструменти с отворен код. Разработка на открито, споделяне на идеи и създаване на инструменти.',
            hr: 'Softverski alati otvorenog koda. Gradimo otvoreno, dijelimo ideje i gradimo alate.',
            cs: 'Open source softwarové nástroje. Vývoj na veřejnosti, sdílení nápadů a tvorba nástrojů.',
            da: 'Open source-softwareværktøjer. Bygger åbent, deler idéer og bygger værktøjer.',
            nl: 'Opensourcesoftwaretools. Open bouwen, ideeën delen en tools bouwen.',
            et: 'Avatud lähtekoodiga tarkvaratööriistad. Ehitame avalikult, jagame ideid ja loome tööriistu.',
            fi: 'Avoimen lähdekoodin ohjelmistotyökalut. Rakennamme avoimesti, jaamme ideoita ja rakennamme työkaluja.',
            fr: "Outils logiciels open source. Développement ouvert, partage d'idées et création d'outils.",
            de: 'Open-Source-Softwarewerkzeuge. Offene Entwicklung, Ideenaustausch und Werkzeugentwicklung.',
            el: 'Εργαλεία λογισμικού ανοιχτού κώδικα. Χτίζουμε ανοιχτά, μοιραζόμαστε ιδέες και δημιουργούμε εργαλεία.',
            hu: 'Nyílt forráskódú szoftvereszközök. Nyílt fejlesztés, ötletek megosztása és eszközök készítése.',
            ga: 'Uirlisí bogearraí foinse oscailte. Ag tógáil go hoscailte, ag roinnt smaointe agus ag tógáil uirlisí.',
            it: 'Strumenti software open source. Sviluppo aperto, condivisione di idee e creazione di strumenti.',
            lv: 'Atvērtā pirmkoda programmatūras rīki. Atklāta izstrāde, ideju dalīšanās un rīku veidošana.',
            lt: 'Atvirojo kodo programinės įrangos įrankiai. Kuriame atvirai, dalijamės idėjomis ir kuriame įrankius.',
            mt: "Għodod ta' software open source. Nibnu fil-miftuħ, naqsmu ideat u nibnu għodod.",
            pl: 'Narzędzia open source. Budujemy otwarcie, dzielimy się pomysłami i tworzymy narzędzia.',
            pt: 'Ferramentas de software de código aberto. Construindo abertamente, compartilhando ideias e criando ferramentas.',
            ro: 'Instrumente software open source. Dezvoltare deschisă, partajare de idei și crearea de instrumente.',
            sk: 'Open source softvérové nástroje. Otvorený vývoj, zdieľanie nápadov a tvorba nástrojov.',
            sl: 'Odprtokodna programska orodja. Odprta gradnja, deljenje idej in ustvarjanje orodij.',
            es: 'Herramientas de software de código abierto. Desarrollo abierto, intercambio de ideas y creación de herramientas.',
            sv: 'Mjukvaruverktyg med öppen källkod. Bygger öppet, delar idéer och bygger verktyg.'
        }
    };

    function detect() {
        try {
            var stored = localStorage.getItem('lang');
            if (stored && VALID[stored]) return stored;
        } catch (e) {}
        var candidates = navigator.languages || [navigator.language || 'en'];
        for (var i = 0; i < candidates.length; i++) {
            var code = candidates[i].split('-')[0].toLowerCase();
            if (VALID[code]) return code;
        }
        return 'en';
    }

    function apply(lang) {
        var els = document.querySelectorAll('[data-i18n]');
        for (var i = 0; i < els.length; i++) {
            var key = els[i].getAttribute('data-i18n');
            if (T[key] && T[key][lang]) {
                els[i].textContent = T[key][lang];
            }
        }

        document.documentElement.lang = lang;

        var page = document.body.getAttribute('data-page');
        var titleKey = 'title.' + page;
        if (T[titleKey] && T[titleKey][lang]) {
            document.title = T[titleKey][lang];
        }

        var metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && T['meta.description'] && T['meta.description'][lang]) {
            metaDesc.setAttribute('content', T['meta.description'][lang]);
        }

        var ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc && T['og.description'] && T['og.description'][lang]) {
            ogDesc.setAttribute('content', T['og.description'][lang]);
        }

        var ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle && T[titleKey] && T[titleKey][lang]) {
            ogTitle.setAttribute('content', T[titleKey][lang]);
        }

        var ogLocale = document.querySelector('meta[property="og:locale"]');
        if (ogLocale && LOCALES[lang]) {
            ogLocale.setAttribute('content', LOCALES[lang]);
        }

        var ldScript = document.querySelector('script[type="application/ld+json"]');
        if (ldScript && T['meta.description'] && T['meta.description'][lang]) {
            try {
                var ld = JSON.parse(ldScript.textContent);
                ld.description = T['meta.description'][lang];
                ldScript.textContent = JSON.stringify(ld, null, 4);
            } catch (e) {}
        }
    }

    function createSwitcher(lang) {
        var div = document.createElement('div');
        div.className = 'lang-switcher';

        var btn = document.createElement('button');
        btn.className = 'lang-switcher__current';
        btn.textContent = lang.toUpperCase();
        btn.setAttribute('aria-label', 'Change language');

        var list = document.createElement('div');
        list.className = 'lang-switcher__list';
        list.style.display = 'none';

        for (var i = 0; i < LANGS.length; i++) {
            var opt = document.createElement('button');
            opt.className = 'lang-switcher__option';
            opt.setAttribute('data-lang', LANGS[i][0]);
            opt.textContent = LANGS[i][1];
            if (LANGS[i][0] === lang) opt.classList.add('lang-switcher__option--active');
            list.appendChild(opt);
        }

        btn.addEventListener('click', function () {
            var visible = list.style.display !== 'none';
            list.style.display = visible ? 'none' : 'block';
        });

        list.addEventListener('click', function (e) {
            var target = e.target;
            if (!target.hasAttribute('data-lang')) return;
            var newLang = target.getAttribute('data-lang');
            try { localStorage.setItem('lang', newLang); } catch (ex) {}
            apply(newLang);
            btn.textContent = newLang.toUpperCase();
            var opts = list.querySelectorAll('.lang-switcher__option');
            for (var j = 0; j < opts.length; j++) {
                opts[j].classList.toggle('lang-switcher__option--active',
                    opts[j].getAttribute('data-lang') === newLang);
            }
            list.style.display = 'none';
        });

        document.addEventListener('click', function (e) {
            if (!div.contains(e.target)) list.style.display = 'none';
        });

        div.appendChild(btn);
        div.appendChild(list);
        document.body.appendChild(div);
    }

    var lang = detect();
    apply(lang);
    createSwitcher(lang);
})();
