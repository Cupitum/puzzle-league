import { gameCatalog } from '../domain/games/catalog';
import { publicConfig } from '../config/public-env';

function App() {
  return (
    <main className="page">
      <header className="header">
        <p className="eyebrow">Puzzle League</p>
        <h1>Development foundation</h1>
        <p className="intro">
          Phase 2: development foundation only. This screen does not submit
          results, create accounts, verify puzzles, or award league points.
        </p>
      </header>
      <section className="panel" aria-labelledby="catalog-title">
        <div className="section-heading">
          <h2 id="catalog-title">Approved pilot game catalogue</h2>
          <span className="pill">5 games</span>
        </div>
        <ul className="game-list">
          {gameCatalog.map((game) => <li key={game.id}>{game.label}</li>)}
        </ul>
        <p className="small">
          The existing Python parser and owner-approved scoring rules are preserved
          in the research folder. TypeScript integration belongs to a later phase.
        </p>
      </section>
      <footer>Not connected to a live league or database. Environment: {publicConfig.stage}.</footer>
    </main>
  );
}
export default App;
