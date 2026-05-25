export function renderHomeRoute(): string {
  return `
    <main data-route="home" class="home-route">
      <section class="hero">
        <p class="eyebrow">Text-first learning engine</p>
        <h1>School of the Ancients</h1>
        <p>Turn a goal, class need, curiosity, or exam target into a structured learning journey.</p>
        <a class="primary-action" href="/goals/new">Start a new goal</a>
      </section>
      <section aria-label="Current M1 loop">
        <h2>Core learning loop</h2>
        <ol>
          <li>Find Goal</li>
          <li>Create Curriculum</li>
          <li>Generate Quest</li>
          <li>Learn with 3-2-1</li>
          <li>Save progress</li>
        </ol>
      </section>
    </main>
  `.trim();
}

export function HomeRoute() {
  return renderHomeRoute();
}
