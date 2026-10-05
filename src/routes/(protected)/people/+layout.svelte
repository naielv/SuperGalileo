<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';

	import { pb } from '$lib/pb';

	let { children } = $props();

	let records = $state([]);
	let sidebar = $state(true);

	let changesFeed = null;

	const dbEvents = {
		'sidebar-toggle': () => (sidebar = !sidebar),
		'sidebar-open': () => (sidebar = true),
		'sidebar-closed': () => (sidebar = false)
	};

	onMount(async () => {
		for (const [event, handler] of Object.entries(dbEvents)) {
			window.addEventListener(event, handler);
		}

		records = await pb.collection('users').getFullList();
		console.warn('Loaded records:', records);
	});
</script>

<div class="duoshell" class:collapsed={!sidebar}>
	
	<div class="recordList">
		<div class="title">
			<h3>Personas</h3>
			<a href="/people/_new">Nuevo</a>
		</div>

		{#each records as record}
			{@const isActive = page.params.id == record.id}
			{@const balance = Number(record.Saldo_Cafe || 0)}
			{@const balanceColor = balance === 0 ? 'red' : ''}
			{@const balanceFormatted = balance.toLocaleString('es-ES', {
				style: 'currency',
				currency: 'EUR'
			})}
			<a class="record" class:active={isActive} href={'/people/' + record.id}>
				{#if false}
					{#await db.getAttachment(record._id, 'foto') then blob}
						<img
							src={URL.createObjectURL(blob)}
							alt={record.data.Nombre}
							loading="lazy"
							height="64"
						/>
					{/await}
				{/if}
				<div class="record-info" style="text-align: left;">
					<b>{record.name}</b>
					<small><i>{record.aula || "Sin aula"}</i></small>
				</div>
				<b class="price" style:color={balanceColor}>{balanceFormatted}</b>
			</a>
		{/each}
	</div>
	<div class="content">
		{@render children()}
	</div>
</div>

<style>
	:global(section.content:has(.duoshell)) {
		padding: 0 !important;
	}

	div.content {
		padding: 0 !important;
		background-color: wheat;
	}
	@media print {
		div.content {
			background-color: transparent;
		}
	}
	.price {
		text-align: right;
		white-space: nowrap;
	}
</style>
