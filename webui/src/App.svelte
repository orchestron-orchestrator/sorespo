<script>
  import { Router, Link, Route } from "svelte-routing";
  import DeviceList from "./components/DeviceList.svelte";
  import DeviceDetail from "./components/DeviceDetail.svelte";
  import QueueDashboard from "./components/QueueDashboard.svelte";

  export let url = "";
  
  // Create a custom event for refresh that components can listen to
  function handleRefresh() {
    window.dispatchEvent(new CustomEvent('global-refresh'));
  }
</script>

<Router {url}>
  <nav>
    <div class="nav-container">
      <div class="nav-left">
        <h1>Orchestron</h1>
        <ul>
          <li>
            <Link to="/">Devices</Link>
          </li>
          <li>
            <Link to="/config-queue">Config Queue</Link>
          </li>
        </ul>
      </div>
      <button class="refresh-btn" on:click={handleRefresh} title="Refresh current view">
        ↻ Refresh
      </button>
    </div>
  </nav>

  <main>
    <Route path="device/:id" let:params>
      <DeviceDetail deviceId={params.id} />
    </Route>
    <Route path="config-queue">
      <QueueDashboard />
    </Route>
    <Route path="/">
      <DeviceList />
    </Route>
  </main>
</Router>

<style>
  nav {
    background-color: #2c3e50;
    color: white;
    padding: 1rem 0;
    margin-bottom: 2rem;
  }

  .nav-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .nav-left {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    gap: 1rem;
  }

  li :global(a) {
    color: white;
    text-decoration: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  li :global(a:hover) {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .refresh-btn {
    padding: 0.5rem 1rem;
    background-color: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.2s;
  }

  .refresh-btn:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }

  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }
</style>