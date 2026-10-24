import { useEffect, useState } from 'react';
import DayTool from './DayTool';
import CalendarTool from './CalendarTool';

type Tab = 'day' | 'calendar';

const tabFromHash = (): Tab => (location.hash === '#calendar' ? 'calendar' : 'day');

export default function App() {
    const [tab, setTab] = useState<Tab>(tabFromHash);

    useEffect(() => {
        const sync = () => setTab(tabFromHash());
        window.addEventListener('hashchange', sync);
        return () => window.removeEventListener('hashchange', sync);
    }, []);

    function select(t: Tab) {
        history.replaceState(null, '', t === 'day' ? location.pathname : '#calendar');
        setTab(t);
    }

    return (
        <main className="page page--tool">
            <a className="page__home" href="/">&#8592; Bang Labs</a>

            <header className="mast">
                <span className="mast__mark">{'{✎}'}</span>
                <h1 className="mast__slogan">Print the day you plan.</h1>
                <p className="mast__lede">
                    Paper planners built around GlyphClock time, and a four-month
                    calendar with holidays, sky events and your own dates. Generated
                    in your browser — nothing you enter leaves it.
                </p>
            </header>

            <nav className="tabs" role="tablist">
                <button className="tabs__tab" role="tab" aria-selected={tab === 'day'} onClick={() => select('day')}>Day planners</button>
                <button className="tabs__tab" role="tab" aria-selected={tab === 'calendar'} onClick={() => select('calendar')}>Calendar</button>
            </nav>

            {tab === 'day' ? <>
                <DayTool />
                <div className="section about">
                    <span className="section__kicker">GlyphClock time</span>
                    <p>
                        The day planners replace clock hours with{' '}
                        <a href="https://glyphclock.bang-labs.eu">GlyphClock</a> blocks: sixteen
                        glyphs of 90 minutes each, counted from UTC midnight. Each row shows the
                        local time the glyph starts in the zone you pick. Because most offsets
                        are not a multiple of 90 minutes, the glyphs shift when daylight saving
                        time starts or ends — pick the date you will use the planner on.
                    </p>
                </div>
            </> : <CalendarTool />}

            <p className="page__foot">Made by <a href="/">Bang Labs</a>.</p>
        </main>
    );
}
