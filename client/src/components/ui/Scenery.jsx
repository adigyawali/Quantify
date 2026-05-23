/**
 * Decorative gradient orbs for hero / page backgrounds.
 * Renders inside a relative-positioned container.
 */
export default function Scenery({ orbs = ['violet', 'cyan'] }) {
  return (
    <div className="scenery" aria-hidden>
      {orbs.includes('violet') && <div className="scenery-orb scenery-orb--violet" />}
      {orbs.includes('cyan') && <div className="scenery-orb scenery-orb--cyan" />}
      {orbs.includes('emerald') && <div className="scenery-orb scenery-orb--emerald" />}
    </div>
  );
}
