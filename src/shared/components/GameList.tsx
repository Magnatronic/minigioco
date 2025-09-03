import type { GameDefinition } from '../../types/game';

export function GameList({
  games,
  selectedId,
  onSelect
}: {
  games: GameDefinition[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!games.length) {
    return <p>No games installed yet. Install a game to begin.</p>;
  }

  return (
    <div className="game-list" role="listbox" aria-label="Available games">
      {games.map((g) => (
        <button
          key={g.id}
          className={`btn btn--list ${selectedId === g.id ? 'is-active' : ''}`}
          role="option"
          aria-selected={selectedId === g.id}
          onClick={() => onSelect(g.id)}
        >
          <span className="game-name">{g.name}</span>
          <span className="game-desc">{g.description}</span>
        </button>
      ))}
    </div>
  );
}
