<script>
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/assets/style.css';
	import SidebarButton from '$lib/comp/buttons/SidebarButton.svelte';
	import Header from '$lib/comp/Header.svelte';
	import { m } from '$lib/paraglide/messages';
	let { children } = $props();

	let currentSyncRandomInt = $state(null);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{m.app_name()}</title>
	<meta name="theme-color" content={currentSyncRandomInt === null
		? 'black'
		: `hsl(${currentSyncRandomInt}deg 40% 30%)`} />
</svelte:head>

<div
	class="shell"
	style:--accent={currentSyncRandomInt === null
		? 'black'
		: `hsl(${currentSyncRandomInt}deg 40% 30%)`}
>
	<Header
		onDatabaseHashChange={(hash) => {
			var multiplier = 8
			currentSyncRandomInt = (hash * multiplier) % 360;
			console.debug("Hue Change", {level: hash, hue: currentSyncRandomInt, multiplier: multiplier})
		}}
		toggleSidebar={() => {
			window.dispatchEvent(new CustomEvent('sidebar-toggle'));
		}}
	/>
	<div class="row">
		<section class="content">
			{@render children()}
		</section>
	</div>
</div>

<style>
	.shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background-color: var(--accent, black);
		transition: background-color 1.75s ease-in-out;
	}
	.shell .row {
		display: flex;
		flex-direction: row;
		height: calc(100% - 42px);
	}

	.shell section.content {
		background-color: white;
		flex: 1;
		padding: 20px;
		overflow-y: auto;
	}
	@media (prefers-reduced-motion: reduce) {
		.shell {
			transition: none;
		}
	}
	@media print {
		.shell {
			background-color: white;
			height: auto;
		}
	}
</style>
