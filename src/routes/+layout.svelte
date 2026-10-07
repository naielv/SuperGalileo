<script>
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/assets/style.css';
	import SidebarButton from '$lib/comp/buttons/SidebarButton.svelte';
	import Header from '$lib/comp/Header.svelte';
	import { m } from '$lib/paraglide/messages';
	import { Toaster } from 'svelte5-toaster'
	let { children, data } = $props();

</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>SuperOrtuella</title>
	<meta name="theme-color" content="hsl(0deg 40% 30%)" />
</svelte:head>

<div
	class="shell"
	style:--accent="hsl(0deg 40% 30%)"
>
	<Header
		user={data.user}
		toggleSidebar={() => {
			window.dispatchEvent(new CustomEvent('sidebar-toggle'));
		}}
	/>
	<div class="row">
		<section class="content">
			<Toaster position="top-center" theme="light" variant="rich" stack="vertical" />
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
		/*transition: background-color 0.5s ease-in-out;*/
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
			height: 100%;
		}
		.shell .row {
			height: 100%;
			background-color: white;
		}
		.shell :global(.duoshell) {
			background-color: white;
			grid-template-columns: 1fr;
		}
		.shell :global(.duoshell .recordList) {
			display: none;
		}
	}
</style>
