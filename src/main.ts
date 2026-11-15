import { Game } from './core/Game';

const container = document.getElementById('app')!;
Game.create(container).then((g) => {
  (window as unknown as { VECTOR: unknown }).VECTOR = g.debug();
}).catch((err) => {
  container.innerHTML = `<pre style="color:#FF2E4C;padding:20px">Failed to start VECTOR: Shift\n${err?.stack ?? err}</pre>`;
});
