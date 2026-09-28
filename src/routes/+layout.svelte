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
		mdiNotebook,
		mdiHome
	} from '@mdi/js';
	let { children } = $props();
	// let sidebar_open = $state(true);

	// function onMenuLinkClick() {
	// 	// If sidebar is open and the screen width is less than 768px, close the sidebar
	// 	if (sidebar_open && window.innerWidth < 768) {
	// 		sidebar_open = false;
	// 	}
	// }
	// Listen to click events on the sidebar .apps container to close the sidebar when a link is clicked
	document.addEventListener('click', (event) => {
		const sidebarApps = document.querySelector('.sidebar .apps');
		if (sidebarApps && sidebarApps.contains(event.target)) {
			onMenuLinkClick();
		}
	});

	// Listen for window resize events to automatically open/close the sidebar based on screen width
	// function handleResize() {
	// 	if (window.innerWidth >= 768) {
	// 		sidebar_open = true;
	// 	} else {
	// 		sidebar_open = false;
	// 	}
	// }
	// window.addEventListener('resize', handleResize);

	let currentSyncRandomInt = $state(null);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{m.app_name()}</title>
</svelte:head>

<div
	class="shell"
	// class:sidebarOpen={sidebar_open}
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
		{#if false}
			<aside class="sidebar no-print">
				<div class="apps">
					<SidebarButton href="/" icon={mdiHome} label={m.home_index()} />
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
		.shell.sidebarOpen section.content {
			display: none;
		}
		.shell.sidebarOpen .sidebar {
			width: 100%;
		}
		.shell.sidebarOpen .sidebar .apps {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
			gap: 10px;
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
