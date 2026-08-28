<script>
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/assets/style.css';
	import SidebarButton from '$lib/comp/buttons/SidebarButton.svelte';
	import Header from '$lib/comp/Header.svelte';
	import { m } from '$lib/paraglide/messages';
	import {
		mdiLogin,
		mdiAccountGroup,
		mdiSchool,
		mdiAccountSupervisorCircle,
		mdiCoffee,
		mdiWallet,
		mdiWarehouse,
		mdiNote,
		mdiStar,
		mdiQrcodeScan,
		mdiCog,
		mdiNotebook
	} from '@mdi/js';
	let { children } = $props();
	let sidebar_open = $state(window.innerWidth >= 768);
	let currentSyncRandomInt = $state(null);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="shell" style:--accent={currentSyncRandomInt === null ? "black" : `hsl(${currentSyncRandomInt}deg 40% 30%)`}>
	<Header
		onDatabaseHashChange={(hash) => {
			currentSyncRandomInt = hash * 2.75 % 360;
			console.log('Database hash changed:', hash, 'Random int:', currentSyncRandomInt);
		}}
		toggleSidebar={() => {
			sidebar_open = !sidebar_open;
		}}
	/>
	<div class="row">
		{#if sidebar_open}
			<aside class="sidebar no-print">
				<div class="apps">
					<!-- <SidebarButton background="darkred" href="/cuenta" icon={mdiLogin} label={m.cuenta()} /> -->
					<SidebarButton href="/people" icon={mdiAccountGroup} label={m.people()} />
					<!-- <SidebarButton background="darkred" href="/classroom_management" icon={mdiSchool} label={m.classroom_management()} /> -->
					<SidebarButton href="/coffee_shop" icon={mdiCoffee} label={m.coffee_shop()} />
					<!-- <SidebarButton background="darkred" href="/wallets" icon={mdiAccountSupervisorCircle} label={m.wallets()} /> -->
					<!-- <SidebarButton background="darkred" href="/food_court" icon={mdiWallet} label={m.food_court()} /> -->
					<!-- <SidebarButton background="darkred" href="/warehouse" icon={mdiWarehouse} label={m.warehouse()} /> -->
					<SidebarButton href="/notes" icon={mdiNote} label={m.notes()} />
					<!-- <SidebarButton background="darkred" href="/activities" icon={mdiStar} label={m.activities()} /> -->
					<!-- <SidebarButton background="darkred" href="/notebook" icon={mdiNotebook} label={m.notebook()} /> -->
					<!-- <SidebarButton background="darkred" href="/qr_scanner" icon={mdiQrcodeScan} label={m.qr_scanner()} /> -->
					<SidebarButton href="/settings" icon={mdiCog} label={m.settings()} />
				</div>
			</aside>
		{/if}
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

	.shell .sidebar {
		width: 250px;
		color: white;
		padding: 20px;
	}
	.shell .sidebar .apps {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.shell section.content {
		background-color: white;
		flex: 1;
		padding: 20px;
		overflow-y: auto;
		border-top-left-radius: 25px;
	}
	@media (max-width: 768px) {
		.shell .sidebar {
			width: 200px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.shell {
			transition: none;
		}
	}
	@media print {
		.shell .sidebar {
			display: none;
		}
		.shell {
			background-color: white;
			height: auto;
		}
	}
</style>
